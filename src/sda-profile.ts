const getRandomId = (min: number, max: number) => {
  return (Math.floor(Math.random() * (max - min + 1)) + min).toString();
};
const getAgeRangeID = () => {
  return getRandomId(3, 15);
};
const getGenderID = () => {
  return getRandomId(49, 52);
};
const getNonProfitID = () => {
  return getRandomId(1539, 1544);
};

interface HistoryResult {
  id: string;
  count: number;
  result: chrome.history.HistoryItem[];
}

const getContentSegmentIds = async (taxonomyRecords: string[][]) => {
  const historyCount = await Promise.all(
    taxonomyRecords.map(async (record): Promise<HistoryResult> => {
      const id = record[0];
      const name = record[2];
      const result = name ? await chrome.history.search({ text: name }) : [];
      var count = result.reduce((sum: number, item) => {
        const visitCount = item.visitCount ?? 0;
        return sum + visitCount;
      }, 0);

      return { id: id, count: count, result: result };
    })
  );

  const results = historyCount.filter((item) => item.count > 0);

  const sorted = results.sort((item1, item2) =>
    item1.count < item2.count ? 1 : -1
  );

  return sorted.map((item) => {
    return { id: item.id };
  });
};

export const getSDAData = async (
  taxonomyRecords: string[][],
  userUid: string
) => {
  const contentSegment = await getContentSegmentIds(taxonomyRecords);
  return {
    user_uid: userUid,
    sda_profile: {
      user: {
        data: [
          {
            name: "mee-browser-extension",
            ext: { segtax: 4 },
            segment: [
              { id: getAgeRangeID() },
              { id: getGenderID() },
              { id: getNonProfitID() },
            ],
          },
        ],
      },
      content: {
        data: [
          {
            name: "mee-browser-extension",
            ext: { segtax: 6 },
            segment: contentSegment,
          },
        ],
      },
    },
  };
};

const unquote = (str: string) => {
  var match;
  return ((match = str.match(/(['"]?)(.*)\1/)) && match[2]) || str;
};

const getValues = (line: string, sep: string): string[] => {
  return line.split(sep).map(function (value) {
    return unquote(value);
  });
};

export const parseTaxonomyRecords = (tsv: string) => {
  const sep = "\t";
  const lines = tsv.split(/[\n\r]/);
  if (lines.length < 2) return [];

  lines.splice(0, 2); //remove header and keys

  return lines.reduce((output: string[][], line) => {
    output.push(getValues(line, sep));
    return output;
  }, []);
};
