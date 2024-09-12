import '@tensorflow/tfjs'
import * as use from '@tensorflow-models/universal-sentence-encoder'

const getRandomId = (min: number, max: number) => {
  return (Math.floor(Math.random() * (max - min + 1)) + min).toString()
}
const getAgeRangeID = () => {
  return getRandomId(3, 15)
}
const getGenderID = () => {
  return getRandomId(49, 52)
}
const getNonProfitID = () => {
  return getRandomId(1539, 1544)
}

interface HistoryResult {
  id: string
  alpha: number
}

export async function getSDAData(taxonomyRecords: string[][], userUid: string) {
  const contentSegment = await parseSearchHistory(taxonomyRecords)
  return parseSDAJson(userUid, contentSegment)
}

async function parseSearchHistory(taxonomyRecords: string[][]) {
  const model = await use.load()

  const history = await chrome.history.search({ text: '', maxResults: 1000 })
  const historyStrings = history.map((i) => i.url).filter((i) => i) as string[]
  const historyEmbeddings = await model.embed(historyStrings)

  const historyCount = await Promise.all(
    taxonomyRecords.map(async (record): Promise<HistoryResult> => {
      const id = record[0]
      const name = record[2]
      const recordEmbedding = await model.embed(name)
      const recordEmbed = recordEmbedding.arraySync()[0]
      const similarities: number[] = []
      historyEmbeddings.arraySync().forEach((historyEmbed) => {
        const similarity = cosineSimilarity(recordEmbed, historyEmbed)
        similarities.push(similarity)
      })
      const alpha = similarities.sort().reduce((acc, cur, idx) => {
        if (idx > 10) return acc
        return acc + cur / Math.pow(2, idx)
      })
      return { id, alpha }
    })
  )

  console.log('RESULTING IN..')
  console.log(historyCount.filter((item) => item.alpha > 0.5))
  return historyCount.filter((item) => item.alpha > 0)
}

function cosineSimilarity(embeddingA: number[], embeddingB: number[]) {
  const dotProduct = embeddingA.reduce((acc, cur, idx) => acc + cur * embeddingB[idx], 0)
  const normA = Math.sqrt(embeddingA.reduce((acc, cur) => acc + cur * cur, 0))
  const normB = Math.sqrt(embeddingB.reduce((acc, cur) => acc + cur * cur, 0))
  return dotProduct / (normA * normB)
}

function parseSDAJson(userUid: string, contentSegment: { id: string }[]) {
  return {
    user_uid: userUid,
    sda_profile: {
      user: {
        data: [
          {
            name: 'mee-browser-extension',
            ext: { segtax: 4 },
            segment: [{ id: getAgeRangeID() }, { id: getGenderID() }, { id: getNonProfitID() }]
          }
        ]
      },
      content: {
        data: [
          {
            name: 'mee-browser-extension',
            ext: { segtax: 6 },
            segment: contentSegment
          }
        ]
      }
    }
  }
}

function unquote(str: string) {
  var match
  return ((match = str.match(/(['"]?)(.*)\1/)) && match[2]) || str
}

function getValues(line: string, sep: string): string[] {
  return line.split(sep).map(function (value) {
    return unquote(value)
  })
}

/*
 * Parses the a TSV string containing taxonomy records, extracting the relevant
 * data into an array of arrays.
 *
 * The function assumes that the first two lines of the input represent headers
 * and keys, which are ignored. Each subsequent line is split into individual
 * values based on the tab separator. Quoted values are unquoted during parsing.
 */
export function parseTaxonomyRecords(tsv: string) {
  const sep = '\t'
  const lines = tsv.split(/[\n\r]/)
  if (lines.length < 2) return []

  lines.splice(0, 2) //remove header and keys

  return lines.reduce((output: string[][], line) => {
    output.push(getValues(line, sep))
    return output
  }, [])
}
