import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildMapaVenoso,
  recolorVenousPixels4,
  VENOUS_4VIEW_COORDS,
  type VenosoMMIIFindings,
} from '@laudousg/schemes'

const assetPath = resolve(process.cwd(), 'apps/web/public/schemas/vascular/venous-4view-v1.png')
const asset = readFileSync(assetPath)
assert.equal(asset.readUInt32BE(16), VENOUS_4VIEW_COORDS.width)
assert.equal(asset.readUInt32BE(20), VENOUS_4VIEW_COORDS.height)
assert.equal(
  createHash('sha256').update(asset).digest('hex'),
  '85b462a51d996d0fc7aab9e6d055a16b2bed1dc0501c7f984743a5ccde3d9e6d',
  'a base venosa divergiu do manifesto',
)

const panelSource = readFileSync(resolve(process.cwd(), 'apps/web/src/components/visualSchemas/VisualSchemaPanel.tsx'), 'utf8')
assert.match(panelSource, /category === 'VENOUS' \? 1 : 3/, 'exportação venosa deve preservar a resolução nativa')
assert.match(panelSource, /category === 'VENOUS' \? 'VENOSO_MMII'/, 'tipo enviado à Sala divergiu')

const emptySide = {
  avaliado: true,
  profundo_pervio: true,
  compressibilidade_profunda: 'normal' as const,
  segmentos: [],
  perfurantes: [],
}

const findings: VenosoMMIIFindings = {
  lados: {
    direito: {
      ...emptySide,
      segmentos: [{
        segmento: 'safena_magna',
        tipo: 'refluxo',
        refluxo_tempo_s: 2.4,
        trombose_extensao: null,
        trombose_idade: null,
        calibre_mm: 5.8,
        termo_do_medico: 'refluxo na safena magna direita',
        descricao_livre: null,
      }],
    },
    esquerdo: emptySide,
  },
  tvp_presente: false,
  observacoes_do_medico: null,
}

const map = buildMapaVenoso(findings)
assert.equal(map.lados.direito.segmentos.safena_magna, 'refluxo')
assert.equal(map.lesoes[0]?.sub, '2,4 s')
assert.equal(map.anotacoes?.[0]?.texto, '5,8 mm')

const pixels = new Uint8ClampedArray(VENOUS_4VIEW_COORDS.width * VENOUS_4VIEW_COORDS.height * 4)
const trace = VENOUS_4VIEW_COORDS.vistas.direito__medial?.safena_magna
assert.ok(trace && trace.length > 2, 'coordenadas da safena magna direita ausentes')
const [x, y] = trace[Math.floor(trace.length / 2)]!
const pixel = (y * VENOUS_4VIEW_COORDS.width + x) * 4
pixels[pixel] = 100
pixels[pixel + 1] = 130
pixels[pixel + 2] = 180
pixels[pixel + 3] = 255
const changed = recolorVenousPixels4(
  pixels,
  VENOUS_4VIEW_COORDS.width,
  VENOUS_4VIEW_COORDS.height,
  map,
  VENOUS_4VIEW_COORDS,
)
assert.equal(changed, 1)
assert.deepEqual(Array.from(pixels.slice(pixel, pixel + 3)), [209, 132, 26])

console.log('Sprint 20A venous web projection: OK')
