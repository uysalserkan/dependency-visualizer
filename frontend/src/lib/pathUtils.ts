/**
 * Normalize path: backslashes to forward slashes, collapse repeated slashes.
 */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+/g, '/')
}

/** Strip leading slash so paths are comparable (tree paths never have leading slash). */
function stripLeadingSlash(p: string): string {
  return p.replace(/^\/+/, '')
}

/**
 * Get path relative to project root. Uses case-insensitive comparison so
 * folder selection works on Windows when project_path / file_path casing differs.
 * For cloned (repository) analysis, project_path is the repo URL so file_path
 * is returned unchanged but with leading slash stripped so tree and folder
 * filter use the same path form.
 */
export function getRelativePath(filePath: string, projectPath: string): string {
  const n = normalizePath(filePath)
  const base = normalizePath(projectPath).replace(/\/$/, '')
  if (!base) return stripLeadingSlash(n)
  const nLower = n.toLowerCase()
  const baseLower = base.toLowerCase()
  if (nLower === baseLower) return stripLeadingSlash(n.slice(base.length).replace(/^\//, '') || n)
  if (nLower.startsWith(baseLower + '/')) return stripLeadingSlash(n.slice(base.length).replace(/^\//, '') || n)
  return stripLeadingSlash(n)
}

/**
 * Return true if relativePath is exactly the folder path or is under that folder.
 * Strips leading slashes so comparison works when relativePath is absolute
 * (e.g. cloned repo with project_path = URL and file_path = absolute).
 */
export function isUnderFolder(relativePath: string, folderPath: string): boolean {
  const norm = stripLeadingSlash(normalizePath(relativePath))
  const folder = stripLeadingSlash(normalizePath(folderPath))
  if (norm === folder) return true
  const prefix = folder + '/'
  return norm.startsWith(prefix)
}
