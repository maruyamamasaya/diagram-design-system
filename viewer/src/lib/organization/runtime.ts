import { S3Client } from '@aws-sdk/client-s3';
import { oidcSettings } from '../oidc';
import { OrganizationService, organizationKey } from './service';
import { S3OrganizationStore } from './s3-store';
/** Construction only: SDK credentials and network are untouched until a request. */
export function organizationRuntime(env: NodeJS.ProcessEnv = process.env, client?: Pick<S3Client, 'send'>) {
 if (env.VIEWER_ORGANIZATION_ENABLED !== 'true') return undefined;
 if (env !== process.env) throw Error('Use deployment environment for enabled organization service');
 if (env.VIEWER_AUTH_MODE !== 'oidc' || env.VIEWER_STORAGE !== 's3') throw Error('Organization requires OIDC and S3');
 const owner = oidcSettings();
 const bucket = env.VIEWER_ORGANIZATION_BUCKET || '';
 const account = env.VIEWER_ORGANIZATION_BUCKET_OWNER || '';
 const libraryID = env.VIEWER_ORGANIZATION_LIBRARY_ID || '';
 if (!bucket || !/^\d{12}$/.test(account) || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(libraryID) || owner.owner === 'UNCONFIGURED') throw Error('Incomplete organization configuration');
 const store = new S3OrganizationStore(client ?? new S3Client({region:'ap-northeast-1',maxAttempts:1}), {bucket,expectedBucketOwner:account,key:organizationKey(owner.issuer,owner.owner)});
 return new OrganizationService(store,{issuer:owner.issuer,sub:owner.owner,libraryID});
}
