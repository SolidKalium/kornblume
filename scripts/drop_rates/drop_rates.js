// See local README.md for more info

const fs = require('fs');
const path = require('path');
const { parse } = require('@fast-csv/parse');

// //// CONFIG //// //
const OUTPUT_VERSION = '' // '3.0'; // If present, saves the output into the project instead of the script's /out folder
const MIN_COUNT = 100; // Minimum sample size for a stage to be included
const MIN_ITEM_DROP_RATE = 0.001; // Minimum for an item to be included on a stage
const MIN_STAGE_TOTAL_DROP_RATE = 0.05; // Minimum drop rate across all items for a stage to be included


// File paths
const inputFilePath = path.join(__dirname, 'in', 'Episode_rate.csv'); // Uses tab name
const staticInputPath = path.join(__dirname, 'in', 'static.json');

let outputFilePath = path.join(__dirname, 'out', 'stages.json');
if (OUTPUT_VERSION) {
    const outputFileName = 'stages' + OUTPUT_VERSION.replace('.','_') + '_greedy.json';
    outputFilePath = path.join(__dirname, '..' /** scripts */, '..' /** git root */, 'public', 'data', outputFileName);
}

const metaColumnNames = {
    // "name": "rawStageName", // Temporary
    "cost": "cost",
    "times": "count",
    // "id": "kdocs-stage-id",
    // "isValid": "isValid", // boolean (arriving as string int)
    // "isVisible": "isVisible",
    // "isEnough": "isEnough", // boolean (arriving as string int)
    // "eff": "efficiency",
    // "边际误差": "efficiencyMargin",
    // "上限期望": "efficiencyUpperBound",
};

const resourceColumnNames = {
    // Things not named according to the English in-game
    // Golden Grass Incense (Golden Herb Incense)
    // Luminite Ore (Pyroxene Ore)
    // Fox Tail (Alopecurus Pratensis)
    // Red Lacquer Slab (Red Lacquer Tablet)
    // Goldbell Spirit Bottle (Golden Bell Essence Bottle)
    "110101": "Trembling Tooth",
    "110102": "Liquefied Terror",
    "110103": "Biting Box",
    "110104": "Bogeyman",
    "110201": "Magnesia Crystal",
    "110202": "Milled Magnesia",
    "110203": "Salted Mandrake",
    "110204": "Incorrupt Monkeypaw",
    "110301": "Shattered Bones",
    "110302": "Esoteric Bones",
    "110303": "Bifurcated Skeleton",
    "110304": "Wyrmling Skeleton",
    "110401": "Silver Ore",
    "110402": "Rough Silver Ingot",
    "110403": "Holy Silver",
    "110404": "Silver Bullet",
    "110501": "Spell of Banishing",
    "110502": "Spell of Fortune",
    "110503": "Prophetic Bird",
    "110504": "Murmur of Insanity",
    "110602": "Cicada Wings",
    "110603": "Winged Key",
    "110604": "Glowing Mothwing",
    "110702": "Perpetual Cog",
    "110703": "Goose Neck",
    "110704": "Watch Core",
    "110802": "Alopecurus Pratensis", // "Fox Tail",
    "110803": "Golden Herb Incense", // "Golden Grass Incense",
    "110804": "Golden Bell Essence Bottle", // "Goldbell Spirit Bottle",
    "110902": "Pyroxene Ore", // "Luminite Ore",
    "110903": "Red Lacquer Tablet", // "Red Lacquer Slab",
    "110904": "Emerald Slate",
    "111001": "Solidus",
    "111002": "Clawed Pendulum",
    "111003": "Platinum Ouija",
    "111004": "Fruit Of Good And Evil",
    "111005": "Mistilteinn",
    "111006": "Golden Fleece",
    "111007": "Serpent Scepter",
    "111008": "Rheingold",
    "111012": "Golden Beetle",
    "111013": "Golden Compass",
    // "190007": "Kern Baby", // Hiding these levels
    // "190008": "Kern Madam",
}

const chapterNameToChapterCode = {
    '丰收时令': {'code': 'HP', 'category': 'Resource', 'comment': 'wilderness materials'},
};

const parseVersion = (version) => {
    if (!version) {
        return [];
    }

    let digits = null;
    if (version.substring(0, 3).toLowerCase() === 'ver') {
        digits = version.substring(3);
    } else {
        digits = version;
    }

    return digits.split('.').map(digit => parseInt(digit, 10));

}

const getStageFields = (stageName) => {
    // Normal story stages
    // Input format: chapterNum - stageNum (optional 故事 or 厄险) (optional Ver)
    // Example: `1-1故事Ver1.0` -> `1-1`
    const storyRegex = /^(?<chapter>\d+)-(?<stage>\d+)\s?(?<difficulty>故事|厄险)?\s?(?<version>Ver[\d.]+)?/;
    const storyMatch = stageName.match(storyRegex);
    if (storyMatch) {
        const { chapter, stage, difficulty, version } = storyMatch.groups;

        const isHard = difficulty === '厄险';
        const stageCode = `${chapter}-${stage}${isHard ? 'H' : ''}`;

        return {
            'code': stageCode,
            // chapter: parseInt(chapter, 10),
            // stage: parseInt(stage, 10),
            // isHard,
            category: isHard ? 'Hard' : 'Story',
            version: parseVersion(version),
        };
    }

    // Special stages
    // Input format: text number (optional Ver)
    // `丰收时令1` -> `HP-1`
    const specialRegex = /^(?<chapter>.+)-?(?<stage>\d+)\s?(?<difficulty>故事|厄险)?\s?(?<version>Ver[\d.]+)?/;
    const specialMatch = stageName.match(specialRegex);
    if (specialMatch) {
        const { chapter, stage, difficulty, version} = specialMatch.groups;

        const isHard = difficulty === '厄险';
        const { code: chapterCode, category } = chapterNameToChapterCode[chapter];
        const stageCode = `${chapterCode}-${stage}${isHard ? 'H' : ''}`;

        return {
            'code': stageCode,
            // chapter: chapterCode,
            // stage: parseInt(stage, 10),
            // isHard,
            category,
            version: parseVersion(version),
        }
    }


    return {};
};

const transformRow = (row) => {
    // I'm not sure why the stage column is named 46 in margin of error. It might not be reliable.
    if (!row || !row.name || row.name === '0') {
        return null;
    }

    const result = {};

    // Add stage code, version, and category
    if (row.name) {
        const name = row.name;
        const fields = getStageFields(name);
        result.name = fields.code // Temporary
        Object.assign(result, fields);
    }

    // Add cost and count
    for (const [csvColumn, jsonColumn] of Object.entries(metaColumnNames)) {
        const value = row[csvColumn];

        if (['数据不足', '#VALUE!'].includes(value)) {
            // Merges a few kinds of invalid cell states. Mainly for Margin of Error data
            result[jsonColumn] = 'INVALID';
        } else if (jsonColumn.substring(0, 2) === 'is') {
            // Handle booleans
            result[jsonColumn] = value === '1';
        } else if (isFinite(value)) {
            // Handle numbers
            result[jsonColumn] = Number(value);
        } else {
            // NOTE: for Margin of Error data: percentages should be normalized to decimals. But we aren't currently using that tab.
            result[jsonColumn] = value;
        }
    }
    if (result.count < MIN_COUNT) {
        // Enforce sample size
        // console.log(`Skipping ${result.code} for low count: ${result.count}`)
        return null;
    }

    // Add drops
    result.drops = {};
    let totalDropRate = 0;
    for (const [csvColumn, jsonColumn] of Object.entries(resourceColumnNames)) {
        const strValue = row[csvColumn];
        if (!strValue) {
            continue;
        }
        const value = parseFloat(strValue);
        if (value > 0) {
            // Excludes guard value -1
            totalDropRate += value;
        }
        if (value < MIN_ITEM_DROP_RATE) {
            // Handles: 0, -1, very small numbers
            // This is safe because even rare drops are usually multiple percent
            continue;
        }
        result.drops[jsonColumn] = Math.round(value * result.count);
    }
    if (totalDropRate < MIN_STAGE_TOTAL_DROP_RATE) {
        // Some early stages have very, very low drop rates across all items
        // console.log(`Skipping ${result.code} with total drop rate ${totalDropRate}`)
        return null;
    };

    // If the column doesn't exist, just return the original row
    return result;
};

const mergeObjects = (obj1, obj2) => {
    // const merged = { ...obj1, ...obj2 };
    const merged = { ...obj1 };
    Object.entries(obj2).forEach(([code, data]) => {
        if (merged[code]) {
            console.warn(`Overwriting generated data for ${code} with static stage definition.`);
        }
        merged[code] = data;
    });
    return merged;
};

const loadJson = (fileName) => {
    try {
        const json = fs.readFileSync(fileName, 'utf-8');
        return JSON.parse(json);
    } catch (error) {
        console.warn(`Unable to load file: ${fileName}`, error);
    }
    return {}
};

const processData = async () => {
    const records = [];
    const parser = parse({ headers: true })
        .on('data', row => {
            // Convert rows from csv to json
            const transformedRow = transformRow(row);
            // If the csv row lacked meaningful data, it returned null, so skip it
            if (transformedRow) {
                records.push(transformedRow);
            }
        })
        .on('end', (rowCount) => {
            // Convert from a list to an object
            // Keep the highest game version for each stage
            const stages = {};
            records.forEach(row => {
                const {code, version} = row;
                if (
                  !stages[code] ||
                  version > stages[code].version
                ) {
                    stages[code] = row;
                }
            });

            // Clean up keys that are no longer needed
            const keysToRemove = [
                'version',
                'code', // temporary
            ];
            Object.values(stages).forEach(stage => {
                keysToRemove.forEach(key => {
                    delete stage[key];
                })
            });

            // Add id to each row
            let nextID = 9000; // Starting high to avoid conflicts
            Object.values(stages).forEach(stage => {
                stage.id = nextID;
                nextID += 1;
            });

            // Get static data and merge with generated stages
            const staticStageData = loadJson(staticInputPath);
            const mergedStages = mergeObjects(stages, staticStageData);

            // Write the final JSON
            fs.writeFileSync(outputFilePath, JSON.stringify(mergedStages, null, 2), 'utf-8');
            console.log(
                `Successfully processed ${rowCount} csv rows.\n` +
                `${Object.keys(stages).length} entries imported after processing.\n` +
                `Written to ${path.basename(outputFilePath)}`
            );
        });

    fs.createReadStream(inputFilePath).pipe(parser);
};

processData().catch(err => {
    console.error('An error occurred during data processing:', err);
    process.exit(1);
});

// //////// LATER list ////////
// Trying to auto-download in the script probably isn't worthwhile
//      - Send formatted request to https://www.kdocs.cn/api/v3/office/file/235880063818/async-export and get task id
//      - Periodically check on the task with https://www.kdocs.cn/api/v3/office/asynctasks/normal_export?id=
//      - It eventually returns status:finished and provides a url to download
//      - It likely requires a logged-in session and may have other protections
// Move attribution closer to the planner/stage/item views instead of on the home page?
