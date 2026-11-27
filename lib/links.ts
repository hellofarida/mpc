const BASE_UTM = "utm_source=mpc-guide&utm_medium=app&utm_campaign=pilot";

export const INAT_UPLOAD_URL = "https://www.inaturalist.org/observations/upload";

/**
 * Heartscapes links carry tags so Heartscapes can see how many visitors came from this guide, and from where:
 * utm_content = which button ("garden-join", "garden-volunteer", "page-join", "page-volunteer"),
 * utm_term = which garden's page it was tapped on (if any). Tags only: nothing about the visitor.
 */
function tagged(url: string, placement: string, siteId?: string): string {
  return `${url}?${BASE_UTM}&utm_content=${placement}${siteId ? `&utm_term=${siteId}` : ""}`;
}

export const heartscapesJoinUrl = (placement: string, siteId?: string) =>
  tagged("https://www.heartscapes.org.au/become-a-member", placement, siteId);
export const heartscapesVolunteerUrl = (placement: string, siteId?: string) =>
  tagged("https://www.heartscapes.org.au/volunteer-with-us", placement, siteId);
