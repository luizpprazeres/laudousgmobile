export async function schemaPng(svg: SVGSVGElement, scale = 3): Promise<string> {
  const serialized = new XMLSerializer().serializeToString(svg)
  const source = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(source)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const box = svg.viewBox.baseVal
    const width = box.width || svg.clientWidth
    const height = box.height || svg.clientHeight
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Não foi possível preparar a imagem.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function schemaPdf(png: string, landscape: boolean): Promise<string> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
  const width = pdf.internal.pageSize.getWidth()
  const height = pdf.internal.pageSize.getHeight()
  const image = pdf.getImageProperties(png)
  const availableWidth = width - 20
  const availableHeight = height - 20
  const ratio = Math.min(availableWidth / image.width, availableHeight / image.height)
  const renderedWidth = image.width * ratio
  const renderedHeight = image.height * ratio
  pdf.addImage(png, 'PNG', (width - renderedWidth) / 2, (height - renderedHeight) / 2, renderedWidth, renderedHeight)
  return pdf.output('datauristring')
}

export function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = fileName
  link.click()
}

export function base64Only(dataUrl: string) {
  const comma = dataUrl.indexOf(',')
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
}
