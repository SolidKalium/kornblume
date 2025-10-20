// See local README.md for more info

const fs = require('fs');
const path = require('path');
const { parse } = require('@fast-csv/parse');

const inputFilePath = path.join(__dirname, 'in', 'Episode_rate.csv'); // Uses tab name
const outputFilePath = path.join(__dirname, 'out', 'stages.json');

// TODO translate and read the text pages on the source sheets?
const metaColumnNames = { // TODO use columns from Episode_rate
    "name": "rawStageName", // Temporary
    "cost": "cost",
    "times": "times",
    "isValid": "isValid", // boolean (arriving as string int)
    "isEnough": "isEnough", // boolean (arriving as string int)
    "eff": "efficiency",
    "边际误差": "efficiencyMargin",
    "上限期望": "efficiencyUpperBound",
};

const resourceColumnNames = {
    "110101": "Trembling Tooth",
    "110102": "Liquefied Terror",
    "110103": "Biting Box",
    "110104": "Bogey man",
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
    "110501": "Spell Of Banishing",
    "110502": "Spell Of Fortune",
    "110503": "Prophetic Bird",
    "110504": "Murmur Of Insanity",
    "110602": "Cicada Wing",
    "110603": "Winged Key",
    "110604": "Glowing Mothwing",
    "110702": "Perpetual Cog",
    "110703": "Goose Neck",
    "110704": "Watch Core",
    "110802": "Fox Tail",
    "110803": "Golden Grass Incense",
    "110804": "Goldbell Spirit Bottle",
    "110902": "Luminite Ore",
    "110903": "Red Lacquer Slab",
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
    "190007": "Kern Baby",
    "190008": "Kern Madam",
}

const chapterNameToChapterCode = {
    '丰收时令': 'HP',
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
    // Normal: num - num (optional 故事 or 厄险) (optional Ver)
    // `1-1故事Ver1.0` -> `1-1`
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
            version: parseVersion(version),
        };
    }

    // Special: text number (optional Ver)
    // `丰收时令1` -> `HP-1`
    const specialRegex = /^(?<chapter>.+)-?(?<stage>\d+)\s?(?<difficulty>故事|厄险)?\s?(?<version>Ver[\d.]+)?/;
    const specialMatch = stageName.match(specialRegex);
    if (specialMatch) {
        const { chapter, stage, difficulty, version} = specialMatch.groups;

        const isHard = difficulty === '厄险';
        const chapterCode = chapterNameToChapterCode[chapter];
        const stageCode = `${chapterCode}-${stage}${isHard ? 'H' : ''}`;

        return {
            'code': stageCode,
            // chapter: chapterCode,
            // stage: parseInt(stage, 10),
            // isHard,
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


    for (const [csvColumn, jsonColumn] of Object.entries(metaColumnNames)) {
        const value = row[csvColumn];
        // if (!value) {
        //     continue;
        // }
        if (['数据不足', '#VALUE!'].includes(value)) {
            // TODO final approach for these
            result[jsonColumn] = 'INVALID';
        } else if (jsonColumn.substring(0, 2) === 'is') {
            // Handle booleans
            result[jsonColumn] = value === '1';
        } else {
            // TODO normalize percentages to decimals
            // TODO store numeric values as numbers
            result[jsonColumn] = value;
        }
    }

    // TOOD put this in a resource sub-object
    for (const [csvColumn, jsonColumn] of Object.entries(resourceColumnNames)) {
        const strValue = row[csvColumn];
        if (!strValue) {
            continue;
        }
        const value = parseFloat(strValue);
        if (value < 0.001) {
            // Handles: 0, -1, very small numbers
            // This is safe because even rare drops are usually multiple percent
            continue;
        }
        // TODO round remaining values to 4 or 5 decimal places or sigfigs
        // TODO these aren't drop rates... They may need to be normalized. Or a different sheet used. We probably want the episode_rate tab instead. It looks like it includes only rows that are isValid or isVisible, where isVisible is essentially an override for cases where isValid is false but we should trust the data anyways. Need to validate those against the data currently live on the site. Seems like it mostly matches.
        // But for 7-16H: why do the numbers almost match v1.9 instead of v2.6? I'm guessing the 1.9 numbers are being used, but are slightly out of date. Admittedly, the 2.6 numbers aren't as robust (44 examples).
        // And 7-18 has no drops on story or hard??? That doesn't seem right. I guess it just really has no data.
        // We may want to validate that each stage we keep drops at least one thing.
        // May also want to check how many things each stage drops, on average?
        result[jsonColumn] = value;
    }

    if (row.name) {
        const name = row.name;
        const fields = getStageFields(name);
        Object.assign(result, fields);
    }

    // If the column doesn't exist, just return the original row
    return result;
};

const processData = async () => {
    const records = [];
    const parser = parse({ headers: true })
        .on('error', error => {
            console.error('CSV parsing error:', error);
            process.exit(1);
        })
        .on('data', row => {
            // Collect rows
            const transformedRow = transformRow(row);
            if (transformedRow) {
                records.push(transformedRow);
            }
        })
        .on('end', (rowCount) => {
            // // TODO Perform version filtering
            // const mostRecentLevels = {};
            // records.forEach(row => {
            //     const levelKey = `${row.chapter}-${row.stage}-${row.difficulty}`;
            //     const currentVersion = parseFloat(row.version);
            //     if (
            //       !mostRecentLevels[levelKey] ||
            //       currentVersion > parseFloat(mostRecentLevels[levelKey].version)
            //     ) {
            //         mostRecentLevels[levelKey] = row;
            //     }
            // });
            // const finalData = Object.values(mostRecentLevels);

            // Write the final JSON
            fs.writeFileSync(outputFilePath, JSON.stringify(records, null, 2), 'utf-8');
            console.log(`Successfully processed ${rowCount} rows and saved data to ${outputFilePath}`);
        });

    fs.createReadStream(inputFilePath).pipe(parser);
};

processData().catch(err => {
    console.error('An error occurred during data processing:', err);
    process.exit(1);
});

// //////// TODO list ////////
// cleanup README
// check if file can be auto-downloaded using axios or similar. Use manual download for now. Could set it up to dynamically try both, but that's definitely overkill for the moment.
// Validate against destination format
// Validate that we are obtaining enough data to provide a reasonably full menu of options.
// Create static data to merge with?
// Improve credit given to be closer to the actual planner instead of on the home page?
// Consider optimizing file streaming. Favor simplicity and reliability.
// Consider improving error handling (don't call process.exit(1) in two different places)
// Is it worth using typescript? Let's skip while drafting.
// Change @fast-csv/parse from dev to an optional dependency?

// //// Logic ////
// Make sure levels have a reasonable amount of data backing them up
// Only consider latest version listed per level. Filter out any data that is low confidence.
// Filter out any "blank" rows
