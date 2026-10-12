function splitLongText(text, maxLength) {
  const parts = [];
  let remainingText = text.trim();

  while (remainingText.length > maxLength) {
    const candidate = remainingText.slice(0, maxLength + 1);
    const paragraphBreak = candidate.lastIndexOf("\n\n");
    const sentenceBreak = candidate.lastIndexOf(". ");
    const splitAt = Math.max(paragraphBreak, sentenceBreak + 1);
    const safeSplitAt = splitAt > maxLength * 0.5 ? splitAt : maxLength;

    parts.push(remainingText.slice(0, safeSplitAt).trim());
    remainingText = remainingText.slice(safeSplitAt).trim();
  }

  if (remainingText) {
    parts.push(remainingText);
  }

  return parts;
}

function readSections(text, fallbackHeading) {
  const sections = [];
  let currentHeading = fallbackHeading;
  let currentLines = [];

  function saveSection() {
    const content = currentLines.join("\n").trim();

    if (content) {
      sections.push({ heading: currentHeading, content });
    }
  }

  for (const line of text.replaceAll("\r\n", "\n").split("\n")) {
    const headingMatch = line.match(/^#{1,6}\s+(.+)$/);

    if (headingMatch) {
      saveSection();
      currentHeading = headingMatch[1].trim();
      currentLines = [];
      continue;
    }

    currentLines.push(line);
  }

  saveSection();
  return sections;
}

export function chunkDocument(text, fallbackHeading, maxLength = 1_800) {
  if (typeof text !== "string" || !text.trim()) {
    return [];
  }

  const chunks = [];

  for (const section of readSections(text, fallbackHeading)) {
    for (const content of splitLongText(section.content, maxLength)) {
      chunks.push({
        heading: section.heading,
        content,
        sectionPath: section.heading,
        chunkOrder: chunks.length,
      });
    }
  }

  return chunks;
}
