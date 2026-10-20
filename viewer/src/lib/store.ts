import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  paginateListObjectsV2,
} from "@aws-sdk/client-s3";
import {
  fromNodeProviderChain,
  fromTemporaryCredentials,
} from "@aws-sdk/credential-providers";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ApiError, config, error } from "./config";
import {lifecycleRuntime} from './lifecycle-runtime';
import { token } from "./auth";
import { presentationManifest, target, type Manifest, type Artifact } from "./manifest";
export type { Manifest, Artifact } from "./manifest";
const root = path.resolve(process.cwd(), "..");
const requireProject = createRequire(path.join(root, "package.json"));
const { validateMetadata } = requireProject("./src/upload/metadata.cjs");
const { S3Storage } = requireProject("./src/upload/s3-storage.cjs");
const policy = {
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Action: [
        "s3:GetBucketLocation",
        "s3:GetBucketPublicAccessBlock",
        "s3:GetBucketOwnershipControls",
        "s3:GetEncryptionConfiguration",
        "s3:GetBucketPolicyStatus",
      ],
      Resource: `arn:aws:s3:::${target.bucket}`,
    },
    {
      Effect: "Allow",
      Action: "s3:ListBucket",
      Resource: `arn:aws:s3:::${target.bucket}`,
      Condition: { StringLike: { "s3:prefix": ["library/catalog/*", "library/state/*"] } },
    },
    {
      Effect: "Allow",
      Action: "s3:GetObject",
      Resource: [
        `arn:aws:s3:::${target.bucket}/library/catalog/*`,
        `arn:aws:s3:::${target.bucket}/library/diagrams/*`,
        `arn:aws:s3:::${target.bucket}/library/state/*`,
      ],
    },
    ...(process.env.VIEWER_STORAGE_CAPACITY_ENABLED === "true" ? [{
      Effect: "Allow", Action: "s3:ListBucketVersions", Resource: `arn:aws:s3:::${target.bucket}`,
    }] : []),
    ...(process.env.VIEWER_TRASH_ENABLED === "true" ? [{Effect: "Allow", Action: "s3:PutObject", Resource: `arn:aws:s3:::${target.bucket}/library/state/*`}] : []),
  ],
};
let client: S3Client;
export function s3() {
  return (client ??= new S3Client({
    region: target.region,
    maxAttempts: 2,
    credentials: process.env.VIEWER_AUTH_MODE === "oidc" ? fromNodeProviderChain() : fromTemporaryCredentials({
      masterCredentials: fromNodeProviderChain({
        profile: process.env.VIEWER_AWS_SOURCE_PROFILE || "default",
      }),
      clientConfig: { region: target.region },
      params: {
        RoleArn:
          process.env.VIEWER_S3_ROLE_ARN ||
          "arn:aws:iam::676643701781:role/diagram-design-system-uploader",
        RoleSessionName: "diagram-viewer-readonly",
        Policy: JSON.stringify(policy),
        DurationSeconds: 900,
      },
    }),
  }));
}
let cache: { until: number; data: Manifest[] } | null = null;
let pending: Promise<Manifest[]> | null = null;
export type CatalogWarning = {id:string;version:number;code:string};
let rejected: CatalogWarning[] = [];
export function catalogWarnings() { return rejected; }
export function invalidateCatalog() { cache=null; rejected=[]; }
const mockFolders=new Map<string,string>();
async function scan(): Promise<Manifest[]> {
  if (config().storage === "mock") {
    const index=JSON.parse(await fs.readFile(path.join(process.cwd(),'.local/mock/index.json'),'utf8')) as string[];
    const result:Manifest[]=[];
    for(const name of index) {
      if(!/^[a-z0-9-]+$/.test(name)) error(409,'INVALID_MANIFEST');
      const folder=path.join(process.cwd(),'.local/mock',name);
      const m=JSON.parse(await fs.readFile(path.join(folder,'metadata.json'),'utf8'));
      const normalized=['presentation-s3-1.0','illustration-s3-1.0'].includes(m.schemaVersion) ? presentationManifest(m,m.catalogKey,'2026-10-09T00:00:00.000Z') : {...validateMetadata(m),pageCount:1};
      mockFolders.set(normalized.catalogKey,folder);result.push(normalized);
    }
    return result;
  }
  await new S3Storage(target, { client: s3() }).preflight();
  const keys: string[] = [];
  for await (const page of paginateListObjectsV2(
    { client: s3() },
    {
      Bucket: target.bucket,
      ExpectedBucketOwner: target.expectedBucketOwner,
      Prefix: "library/catalog/",
      MaxKeys: 1000,
    },
  )) {
    for (const object of page.Contents || [])
      if (object.Key?.endsWith("/metadata.json") || object.Key?.endsWith("/upload-manifest.json")) keys.push(object.Key);
    if (keys.length > 500) error(503, "CATALOG_CAPACITY");
  }
  const results: Manifest[] = [];
  const warnings: CatalogWarning[] = [];
  for (let i = 0; i < keys.length; i += 6) {
    const batch = await Promise.all(
      keys.slice(i, i + 6).map(async (key) => {
        const response = await s3().send(
          new GetObjectCommand({
            Bucket: target.bucket,
            Key: key,
            ExpectedBucketOwner: target.expectedBucketOwner,
          }),
        );
        try {
        if (!response.ContentLength || response.ContentLength > 131072) {
          (
            response.Body as import("node:stream").Readable | undefined
          )?.destroy();
          error(409, "INVALID_MANIFEST");
        }
        const bytes = await response.Body!.transformToByteArray();
        if (bytes.length > 131072) error(409, "INVALID_MANIFEST");
        const m = JSON.parse(Buffer.from(bytes).toString("utf8"));
        if (!m || typeof m !== 'object' || Array.isArray(m)) error(409,'INVALID_MANIFEST');
        const normalized:Manifest=['presentation-s3-1.0','illustration-s3-1.0'].includes(m.schemaVersion)
          ? presentationManifest(m,key,response.LastModified?.toISOString()||'')
          : (()=>{try{return {...validateMetadata(m),pageCount:1};}catch{return error(409,'INVALID_MANIFEST');}})();
        if (
          m.catalogKey !== key ||
          Object.entries(m.storage).some(
            ([k, v]) => v !== (target as Record<string, unknown>)[k],
          ) ||
          response.ServerSideEncryption !== "AES256"
        )
          error(409, "INVALID_MANIFEST");
        return normalized;
        } catch (e) {
          if (!(e instanceof SyntaxError) && !(e instanceof ApiError && e.code === 'INVALID_MANIFEST')) throw e;
          const match=/^library\/catalog\/([a-f0-9-]{36})\/versions\/([0-9]{6})\/(?:metadata|upload-manifest)\.json$/.exec(key);
          if (!match) throw e;
          warnings.push({id:match[1],version:Number(match[2]),code:'INVALID_MANIFEST'});
          return null;
        }
      }),
    );
    results.push(...batch.filter((m): m is Manifest => m !== null));
  }
  rejected = warnings.sort((a,b)=>a.id.localeCompare(b.id)||a.version-b.version);
  return results;
}
export async function catalog() {
  if (cache && cache.until > Date.now()) return cache.data;
  if (!pending)
    pending = scan()
      .then((data) => {
        cache = { until: Date.now() + 60000, data };
        return data;
      })
      .finally(() => {
        pending = null;
      });
  return pending;
}
const annotations = JSON.parse(
  readFileSync(path.join(process.cwd(), "config/tags.json"), "utf8").replace(
    /^\uFEFF/,
    "",
  ),
) as Record<string, string[]>;
for (const values of Object.values(annotations))
  if (
    !Array.isArray(values) ||
    values.length > 20 ||
    values.some((v) => typeof v !== "string" || v.length > 80)
  )
    throw Error("Invalid server tag annotations");
export function tags(m: Manifest) {
  return annotations[m.diagramId] || [];
}
export function summary(m: Manifest) {
  return {
    id: m.diagramId,
    title: m.title,
    type: m.diagramType,
    tags: tags(m),
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    version: m.version,
    formats: m.outputFormats,
    previewAvailable: m.files.some(f=>f.format==='png'),
    pageCount:m.pageCount,
    validationChecks: m.validation.checks,
  };
}
export async function find(id: string, version?: number) {
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      id,
    )
  )
    error(400, "INVALID_ID");
  await requireActive(id);
  const all = (await catalog()).filter(
    (m) => m.diagramId === id && (!version || m.version === version),
  );
  const m = all.sort((a, b) => b.version - a.version)[0];
  if (!m) error(404, "NOT_FOUND");
  return m;
}
export function file(m:Manifest,artifact:Artifact,page=1) {
  if(!Number.isInteger(page)||page<1||page>m.pageCount)error(400,'INVALID_PAGE');
  const name=m.diagramType==='presentation'
    ? artifact==='png'?`slides/${String(page).padStart(3,'0')}/slide.png`:artifact==='pdf'?'document.pdf':artifact==='pptx'?'presentation.pptx':''
    : artifact==='png'||artifact==='svg'||artifact==='pdf'?`diagram.${artifact}`:`${artifact}.json`;
  const f=m.files.find(f=>f.name===name || (m.diagramType==='presentation' && artifact==='png' && f.name===`slides/slide-${String(page).padStart(3,'0')}/slide.png`));if(!f)error(404,'NOT_FOUND');return f;
}
export async function access(
  m: Manifest,
  artifact: Artifact,
  purpose: string,
  sid: string,
  sub: string,
  page = 1,
) {
  const f = file(m, artifact, page);
  const seconds = 300;
  let url: string;
  if (config().storage === "s3")
    url = await getSignedUrl(
      s3(),
      new GetObjectCommand({
        Bucket: target.bucket,
        ExpectedBucketOwner: target.expectedBucketOwner,
        Key: f.key,
        ResponseContentType: f.contentType,
        ResponseCacheControl: "private, no-store",
        ResponseContentDisposition: `${purpose === "download" ? "attachment" : "inline"}; filename="${path.basename(f.name)}"`,
      }),
      { expiresIn: seconds },
    );
  else {
    const ticket = await token(
      sid,
      sub,
      "diagram-artifact",
      { id: m.diagramId, version: m.version, artifact, purpose, page },
      seconds,
    );
    url = `${config().origin}/api/artifact?ticket=${ticket}`;
  }
  return {
    url,
    method: "GET",
    expiresAt: new Date(Date.now() + seconds * 1000).toISOString(),
    expiresIn: seconds,
    contentType: f.contentType,
    sizeBytes: f.sizeBytes,
    sha256: f.sha256,
    fileName: path.basename(f.name),
  };
}
export async function mockBytes(m: Manifest, artifact: Artifact, page=1) {
  const f = file(m, artifact, page);
  const bytes = await fs.readFile(
    path.join(mockFolders.get(m.catalogKey)!, f.name),
  );
  if (
    bytes.length !== f.sizeBytes ||
    createHash("sha256").update(bytes).digest("hex") !== f.sha256
  )
    error(409, "INTEGRITY_FAILURE");
  return { bytes, f };
}

// Mutable visibility lives outside immutable artifact/version packages.
export type LibraryState = { schemaVersion: "library-state-1.0"; id: string; trashed: boolean; updatedAt: string };
const statePrefix = "library/state/";
function stateKey(id: string) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id)) error(400, "INVALID_ID");
  return `${statePrefix}${id}.json`;
}
export async function libraryState(id: string): Promise<LibraryState | null> {
  const service=lifecycleRuntime();
  if(service){const current=await service.port.read(id);return current?{schemaVersion:'library-state-1.0',id,trashed:current.entry.status!=='active',updatedAt:current.entry.updatedAt}:null;}
  return legacyLibraryState(id);
}
export async function legacyLibraryState(id: string): Promise<LibraryState | null> {
  const key = stateKey(id);
  if (config().storage === "s3" && process.env.VIEWER_TRASH_ENABLED !== "true") return null;
  let bytes: string;
  try {
    if (config().storage === "mock") bytes = await fs.readFile(path.join(process.cwd(), ".local/mock/state", `${id}.json`), "utf8");
    else {
      const listed = await s3().send(new ListObjectsV2Command({Bucket: target.bucket, Prefix: key, MaxKeys: 1, ExpectedBucketOwner: target.expectedBucketOwner}));
      if (!(listed.Contents || []).some(object => object.Key === key)) return null;
      const r = await s3().send(new GetObjectCommand({Bucket: target.bucket, Key: key, ExpectedBucketOwner: target.expectedBucketOwner}));
      if (!r.ContentLength || r.ContentLength > 4096 || r.ServerSideEncryption !== "AES256") error(409, "INVALID_LIBRARY_STATE");
      const data = await r.Body!.transformToByteArray();
      if (data.length > 4096) error(409, "INVALID_LIBRARY_STATE");
      bytes = Buffer.from(data).toString("utf8");
    }
  } catch (e) {
    if ((e as {code?:string}).code === "ENOENT" || (e as {name?:string}).name === "NoSuchKey") return null;
    throw e;
  }
  const state = JSON.parse(bytes);
  if (state.schemaVersion !== "library-state-1.0" || state.id !== id || typeof state.trashed !== "boolean" || typeof state.updatedAt !== "string" || !Number.isFinite(Date.parse(state.updatedAt)) || Object.keys(state).length !== 4) error(409, "INVALID_LIBRARY_STATE");
  return state;
}
export async function setLibraryState(id: string, trashed: boolean): Promise<LibraryState> {
  if(lifecycleRuntime())error(409,'USE_LIBRARY_LIFECYCLE');
  const key = stateKey(id);
  if (config().storage === "s3" && process.env.VIEWER_TRASH_ENABLED !== "true") error(503, "TRASH_NOT_ENABLED");
  // Validate existence against the complete catalog, including all hidden versions.
  if (!(await catalog()).some(m => m.diagramId === id)) error(404, "NOT_FOUND");
  const state: LibraryState = {schemaVersion: "library-state-1.0", id, trashed, updatedAt: new Date().toISOString()};
  if (config().storage === "mock") {
    const folder = path.join(process.cwd(), ".local/mock/state");
    await fs.mkdir(folder, {recursive: true});
    const temporary = path.join(folder, `${id}-${crypto.randomUUID()}.tmp`);
    await fs.writeFile(temporary, JSON.stringify(state));
    await fs.rename(temporary, path.join(folder, `${id}.json`));
  } else await s3().send(new PutObjectCommand({Bucket: target.bucket, Key: key, ExpectedBucketOwner: target.expectedBucketOwner, Body: JSON.stringify(state), ContentType: "application/json", ServerSideEncryption: "AES256"}));
  return state;
}
export async function requireActive(id: string) {
  if ((await libraryState(id))?.trashed) error(404, "NOT_FOUND");
}
