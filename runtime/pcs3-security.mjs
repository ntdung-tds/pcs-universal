// PCS v3.0.1 defensive persistence boundaries. Not a substitute for enterprise DLP.
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {basename} from 'node:path';

const MAGIC=Buffer.from('PCS3ENC1');
export const CLASSIFICATIONS=Object.freeze(['PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED']);
const SECRET_PATTERNS=[
  ['GITHUB_ACCESS_TOKEN',/\b(?:github_pat_[A-Za-z0-9_]{25,}|gh[pousr]_[A-Za-z0-9]{30,})\b/g],
  ['AWS_ACCESS_KEY_ID',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['OPENAI_API_KEY',/\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b/g],
  ['SLACK_ACCESS_TOKEN',/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g],
  ['PRIVATE_KEY_PEM',/-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/g],
  ['GOOGLE_SERVICE_ACCOUNT_KEY',/"type"\s*:\s*"service_account"[\s\S]{0,1500}?"private_key"\s*:/g],
];
const SENSITIVE_NAMES=[/(^|\/|\\)\.env(?:\..+)?$/i,/(^|\/|\\)id_(?:rsa|ed25519|ecdsa)(?:\.pub)?$/i,/\.(?:p12|pfx|key|keystore|jks)$/i,/(^|\/|\\)(?:credentials|service-account|secrets?)(?:\.[a-z0-9_-]+)?\.json$/i];
export function findHighConfidenceSecrets(input,{filename=''}={}){
  const hits=[];const name=String(filename||'');
  if(SENSITIVE_NAMES.some(p=>p.test(name))) hits.push('SENSITIVE_FILENAME');
  const text=Buffer.isBuffer(input)? input.toString('utf8') : String(input??'');
  for(const [kind,re] of SECRET_PATTERNS){re.lastIndex=0;if(re.test(text))hits.push(kind);}
  return [...new Set(hits)];
}
export function assertSafeState(state){
  const findings=findHighConfidenceSecrets(JSON.stringify(state));
  if(findings.length) throw Error(`SECURITY_BLOCKED: state appears to contain credentials (${findings.join(', ')}); redact and rotate any exposed keys before persistence`);
}
function keyFromEnv(keyBase64=process.env.PCS_ARTIFACT_KEY_B64){
  if(!keyBase64||typeof keyBase64!=='string'||! /^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$/.test(keyBase64)) throw Error('SECURITY_BLOCKED: CONFIDENTIAL artifacts require PCS_ARTIFACT_KEY_B64 containing a fresh 32-byte key (base64)');
  const key=Buffer.from(keyBase64,'base64');if(key.length!==32)throw Error('SECURITY_BLOCKED: encryption key must be 32 bytes');return key;
}
export function encodeArtifact({bytes,filename,classification='INTERNAL',slug,keyBase64=process.env.PCS_ARTIFACT_KEY_B64}){
  if(!Buffer.isBuffer(bytes))throw Error('SECURITY_BLOCKED: bytes must be Buffer');
  if(!CLASSIFICATIONS.includes(classification))throw Error(`SECURITY_BLOCKED: unrecognized classification: ${classification}`);
  if(classification==='RESTRICTED')throw Error('SECURITY_BLOCKED: RESTRICTED data requires an approved data-processing agreement and separate authorized storage design; not uploaded to GitHub/Drive');
  const hits=findHighConfidenceSecrets(bytes,{filename});
  if(hits.length)throw Error(`SECURITY_BLOCKED: suspected credentials or key material (${hits.join(', ')}); do not commit to GitHub or Drive`);
  if(classification!=='CONFIDENTIAL')return {bytes,storedName:basename(filename),classification,encrypted:false};
  const key=keyFromEnv(keyBase64),iv=randomBytes(12);const aad=Buffer.from(`pcs3|${slug}|CONFIDENTIAL`);
  const cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(aad);
  const body=Buffer.concat([cipher.update(bytes),cipher.final()]);const tag=cipher.getAuthTag();
  return {bytes:Buffer.concat([MAGIC,iv,tag,body]),storedName:'confidential-artifact.enc',classification,encrypted:true,encryption:{algorithm:'AES-256-GCM',format:'PCS3ENC1',key_id:'PCS_ARTIFACT_KEY_B64',aad_scope:'project-slug'}};
}
export function decodeConfidentialArtifact(envelope,{slug,keyBase64=process.env.PCS_ARTIFACT_KEY_B64}={}){
  if(!Buffer.isBuffer(envelope)||envelope.length<MAGIC.length+12+16||!envelope.subarray(0,MAGIC.length).equals(MAGIC))throw Error('SECURITY_BLOCKED: invalid encrypted PCS artifact envelope');
  const key=keyFromEnv(keyBase64),iv=envelope.subarray(8,20),tag=envelope.subarray(20,36),body=envelope.subarray(36);
  const decipher=createDecipheriv('aes-256-gcm',key,iv);decipher.setAAD(Buffer.from(`pcs3|${slug}|CONFIDENTIAL`));decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body),decipher.final()]);
}

/** Gate public project STATE by explicit project classification, not repository visibility alone.
 * A prompt or AI-authored flag is not authenticated Owner approval: provider identity and
 * protected-branch review must be verified separately for sensitive decisions.
 */
export function assertPublicProjectSafe(state) {
  if(state?.policy?.repository_visibility!=='PUBLIC' || state?.policy?.public_content_reviewed!==true
      || state?.policy?.content_classification!=='PUBLIC')
    throw Error('PUBLIC_POLICY_REQUIRED: explicit public project/content review required');
  for(const key of ['source_refs','tasks','features','flows','releases','decisions','risks','approvals','artifacts']){
    if(!Array.isArray(state[key]))throw Error('PUBLIC_STATE_INVALID: '+key);
    for(const item of state[key]){
      if(item?.classification!=='PUBLIC')
        throw Error('PUBLIC_DATA_BLOCKED: '+key+' must be explicitly classified PUBLIC');
    }
  }
  assertSafeState(state);
  return true;
}
