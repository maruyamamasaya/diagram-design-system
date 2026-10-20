import { error } from './config';
export type Artifact = 'png' | 'svg' | 'pdf' | 'pptx' | 'input' | 'validation';
export type File = {name:string;format:string;role:string;contentType:string;sizeBytes:number;sha256:string;key:string};
export type Manifest = {
 diagramId:string;title:string;diagramType:string;version:number;createdAt:string;updatedAt:string;
 outputFormats:string[];files:File[];validation:{checks:Record<string,string>};pageCount:number;
 storage:{bucket:string;region:string;expectedBucketOwner:string;prefix:string;encryption:string};catalogKey:string;
};
export {target} from '../../../src/library/presentation-contract.cjs';
import {presentationManifest as normalize} from '../../../src/library/presentation-contract.cjs';
export function presentationManifest(value:unknown,key:string,modified:string):Manifest {
 try { return normalize(value,key,modified); } catch { return error(409,'INVALID_MANIFEST'); }
}
