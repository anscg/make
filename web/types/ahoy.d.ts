// ahoy.js ships no types. Only the surface we actually call is declared here,
// so a typo in an option name still fails the build.
declare module "ahoy.js" {
  interface AhoyConfig {
    urlPrefix?: string
    visitsUrl?: string
    eventsUrl?: string
    page?: string
    platform?: string
    useBeacon?: boolean
    startOnReady?: boolean
    trackVisits?: boolean
    cookies?: boolean
    cookieDomain?: string
    headers?: Record<string, string>
    visitParams?: Record<string, unknown>
    withCredentials?: boolean
    visitDuration?: number
    visitorDuration?: number
  }

  export interface Ahoy {
    configure(config: AhoyConfig): void
    track(name: string, properties?: Record<string, unknown>): void
    trackView(additionalProperties?: Record<string, unknown>): void
    trackClicks(selector?: string): void
    trackSubmits(selector?: string): void
    trackChanges(selector?: string): void
    trackAll(): void
    reset(): boolean
    debug(enabled?: boolean): void
  }

  const ahoy: Ahoy
  export default ahoy
}
