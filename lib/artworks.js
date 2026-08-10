// Public-domain paintings for the tea-room kiosk idle screen.
//
// Every work below was checked against its museum's own API: the Met objects all report
// isPublicDomain: true, and both Cleveland works report share_license_status: "CC0".
// Images are requested live from the museums — nothing is copied into our Storage.
//
// Every image is requested through /api/artwork-image rather than straight from the museum.
// The particle effect has to read real pixels (getImageData), which the browser only permits
// on a cross-origin image whose host sends Access-Control-Allow-Origin on the GET itself.
// Neither museum does: Cleveland sends no CORS header, and the Met sends one on HEAD but not
// on GET — so a direct <img crossOrigin="anonymous"> fails on both and the canvas would be
// unreadable. The route relays the bytes without storing them, so the museums stay the
// source of truth. (Testing this with `curl -I` shows a header that a real GET never sends;
// it has to be checked in a browser.)

export const ARTWORKS = [
  { source: "met", id: 74462 },
  { source: "met", id: 45329 },
  { source: "met", id: 53012 },
  { source: "met", id: 49131 },
  { source: "met", id: 77191 },
  { source: "cleveland", id: "1985.71.2" },
  { source: "cleveland", id: "2000.69" },
  { source: "met", id: 77880 },
  { source: "met", id: 902223 },
  { source: "met", id: 57250 },
  { source: "met", id: 54070 },
  { source: "met", id: 54922 },
];

// Day of year, 1-based, in the viewer's own timezone — the kiosk sits in one room, so local
// midnight is the right moment for the picture to change.
export function dayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

export function artworkForDay(date = new Date()) {
  return ARTWORKS[dayOfYear(date) % ARTWORKS.length];
}

// Both museums are normalised to one shape so the component never branches on source.
export async function fetchArtwork(entry, signal) {
  if (entry.source === "met") {
    const res = await fetch(
      `https://collectionapi.metmuseum.org/public/collection/v1/objects/${entry.id}`,
      { signal },
    );
    if (!res.ok) throw new Error(`Met API ${res.status}`);
    const d = await res.json();
    // web-large, not the original — originals run to tens of megabytes and this is a tablet.
    const url = d.primaryImageSmall || d.primaryImage;
    if (!url) throw new Error("no image for Met object " + entry.id);
    return {
      imageUrl: `/api/artwork-image?src=${encodeURIComponent(url)}`,
      title: d.title || "",
      artist: d.artistDisplayName || "",
      date: d.objectDate || "",
      museum: "The Metropolitan Museum of Art",
    };
  }

  const res = await fetch(
    `https://openaccess-api.clevelandart.org/api/artworks/?accession_number=${encodeURIComponent(entry.id)}&limit=1`,
    { signal },
  );
  if (!res.ok) throw new Error(`Cleveland API ${res.status}`);
  const d = (await res.json())?.data?.[0];
  const url = d?.images?.web?.url;
  if (!url) throw new Error("no image for Cleveland " + entry.id);
  // "Min Zhen (Chinese, 1730–after 1788)" → "Min Zhen"; the dates are shown separately.
  const artist = (d.creators?.[0]?.description || "").replace(/\s*\(.*$/, "");
  return {
    imageUrl: `/api/artwork-image?src=${encodeURIComponent(url)}`,
    title: d.title || "",
    artist,
    date: d.creation_date || "",
    museum: "The Cleveland Museum of Art",
  };
}
