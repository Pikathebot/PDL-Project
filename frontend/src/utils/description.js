// A report filed with media and no text gets its description written by the
// AI pipeline, which records that in ai_provenance so it is never shown as
// the citizen's own words.
export function aiDescribed(incident) {
  return Boolean(incident?.structured_details?.ai_provenance?.description);
}

// Card text: the description, a pending note while the AI is still writing
// one, and an "AI:" prefix once it has.
export function cardDescription(incident) {
  if (!incident?.description) return 'Media report, AI description pending…';
  return aiDescribed(incident) ? `AI: ${incident.description}` : incident.description;
}
