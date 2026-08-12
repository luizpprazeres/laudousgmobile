export type ReportSuggestionDiff = {
  removed: string[]
  added: string[]
}

function reportBlocks(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
}

/**
 * Compara o laudo por blocos usando uma LCS pequena. Assim, uma alteração no
 * fígado não faz todo o restante do documento aparecer como modificado.
 */
export function diffReportBlocks(currentText: string, proposedText: string): ReportSuggestionDiff {
  const current = reportBlocks(currentText)
  const proposed = reportBlocks(proposedText)
  const rows = current.length + 1
  const columns = proposed.length + 1
  const lcs = Array.from({ length: rows }, () => Array<number>(columns).fill(0))

  for (let i = current.length - 1; i >= 0; i -= 1) {
    for (let j = proposed.length - 1; j >= 0; j -= 1) {
      lcs[i][j] = current[i] === proposed[j]
        ? 1 + lcs[i + 1][j + 1]
        : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const removed: string[] = []
  const added: string[] = []
  let i = 0
  let j = 0

  while (i < current.length && j < proposed.length) {
    if (current[i] === proposed[j]) {
      i += 1
      j += 1
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      removed.push(current[i] as string)
      i += 1
    } else {
      added.push(proposed[j] as string)
      j += 1
    }
  }

  while (i < current.length) {
    removed.push(current[i] as string)
    i += 1
  }
  while (j < proposed.length) {
    added.push(proposed[j] as string)
    j += 1
  }

  return { removed, added }
}
