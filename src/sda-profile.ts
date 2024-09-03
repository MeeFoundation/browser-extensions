import * as use from '@tensorflow-models/universal-sentence-encoder'

function getRandomId(min: number, max: number) {
  return (Math.floor(Math.random() * (max - min + 1)) + min).toString()
}
function getAgeRangeID() {
  return getRandomId(3, 15)
}
function getGenderID() {
  return getRandomId(49, 52)
}
function getNonProfitID() {
  return getRandomId(1539, 1544)
}

interface HistoryResult {
  id: string
  count: number
  result: chrome.history.HistoryItem[]
}

export async function getSDAData(taxonomyRecords: string[][], userUid: string) {
  const contentSegment = await parseSearchHistory(taxonomyRecords)
  return parseSDAJson(userUid, contentSegment)
}

async function parseSearchHistory(taxonomyRecords: string[][]) {
  const historyCount = await Promise.all(
    taxonomyRecords.map(async (record): Promise<HistoryResult> => {
      const id = record[0]
      const name = record[2]
      // currently regex for history
      const model = await use.load()
      const recordEmbedding = await model.embed(name)
      recordEmbedding.print()
      // const recordEmbed = recordEmbedding.arraySync()[0]
      const history = await chrome.history.search({ text: '', maxResults: 1000 })
      const historyStrings = history.map((i) => i.url).filter((i) => i) as string[]
      const historyEmbeddings = await model.embed(historyStrings)
      historyEmbeddings.print()
      // historyEmbeddings.arraySync().forEach((historyEmbed) => {
      //   const similarity = cosineSimilarity(recordEmbed, historyEmbed)
      //   console.log(similarity)
      // })

      const result = name ? await chrome.history.search({ text: name }) : []
      var count = result.reduce((sum: number, item) => {
        const visitCount = item.visitCount ?? 0
        return sum + visitCount
      }, 0)

      return { id: id, count: count, result: result }
    })
  )

  const results = historyCount.filter((item) => item.count > 0)

  const sorted = results.sort((item1, item2) => (item1.count < item2.count ? 1 : -1))

  return sorted.map((item) => {
    return { id: item.id }
  })
}

function cosineSimilarity(embeddingA, embeddingB) {
  const dotProduct = embeddingA.dot(embeddingB).dataSync()
  const normA = embeddingA.norm().dataSync()
  const normB = embeddingB.norm().dataSync()
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

/**
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
