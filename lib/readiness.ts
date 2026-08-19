type ReadinessDependencies = { queryDatabase: () => Promise<unknown> }

export async function checkReadiness(dependencies: ReadinessDependencies) {
  try {
    await dependencies.queryDatabase()
    return { status: 200, body: { status: 'ok', service: 'booktrix', database: 'reachable' } } as const
  } catch {
    return { status: 503, body: { status: 'unavailable', service: 'booktrix', database: 'unreachable' } } as const
  }
}
