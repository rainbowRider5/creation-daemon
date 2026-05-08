import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const ARTIFACT_TYPES = [
    'draft',
    'refinement',
    'design',
    'implementation',
    'review',
    'adjustment',
];
const ARTIFACT_FILE_PATTERN = /^(\d{3})-(.+)\.md$/;
function isArtifactType(value) {
    return ARTIFACT_TYPES.includes(value);
}
function issueDir(issueNumber, baseDir) {
    return join(baseDir, 'docs', 'issues', String(issueNumber));
}
function metaPath(issueNumber, baseDir) {
    return join(issueDir(issueNumber, baseDir), 'meta.json');
}
export function readMeta(issueNumber, baseDir = '.') {
    const path = metaPath(issueNumber, baseDir);
    if (!existsSync(path))
        return null;
    return JSON.parse(readFileSync(path, 'utf-8'));
}
export function writeMeta(issueNumber, meta, baseDir = '.') {
    const dir = issueDir(issueNumber, baseDir);
    if (!existsSync(dir))
        mkdirSync(dir, { recursive: true });
    meta.updated = new Date().toISOString();
    writeFileSync(metaPath(issueNumber, baseDir), JSON.stringify(meta, null, 2) + '\n');
}
export function writeArtifact(issueNumber, type, content, baseDir = '.') {
    const dir = issueDir(issueNumber, baseDir);
    const existingSeqs = readdirSync(dir)
        .map((f) => ARTIFACT_FILE_PATTERN.exec(f))
        .filter((m) => m !== null)
        .map((m) => Number(m[1]));
    const nextSeq = Math.max(0, ...existingSeqs) + 1;
    const filename = `${String(nextSeq).padStart(3, '0')}-${type}.md`;
    const filePath = join(dir, filename);
    writeFileSync(filePath, content);
    const meta = readMeta(issueNumber, baseDir);
    if (meta) {
        meta.artifacts.push({
            file: filename,
            type,
            created: new Date().toISOString(),
        });
        writeMeta(issueNumber, meta, baseDir);
    }
    return filePath;
}
export function readArtifacts(issueNumber, baseDir = '.') {
    const dir = issueDir(issueNumber, baseDir);
    if (!existsSync(dir))
        return [];
    return readdirSync(dir)
        .map((file) => ({ file, match: ARTIFACT_FILE_PATTERN.exec(file) }))
        .filter((e) => e.match !== null)
        .sort((a, b) => a.file.localeCompare(b.file))
        .map(({ file, match }) => {
        const type = match[2];
        if (!isArtifactType(type)) {
            throw new Error(`Unknown artifact type in file ${file}: ${type}`);
        }
        return {
            file,
            type,
            content: readFileSync(join(dir, file), 'utf-8'),
        };
    });
}
//# sourceMappingURL=artifact-store.js.map