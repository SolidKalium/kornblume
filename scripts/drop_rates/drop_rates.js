// See local README.md for more info

const fs = require('fs');
const path = require('path');
const { parse } = require('@fast-csv/format'); // format

const inputFilePath = path.join(__dirname, 'in', '误差.csv');
const outputFilePath = path.join(__dirname, 'out', 'stages.json');

// const transformData = (row) => {
//     // TODO remove empty columns per key
//     // TODO round remaining values to 4 or 5 decimal places
//     // TODO rename a large number of columns
//     // TODO normalize percentages to decimals
//     // TODO handle multiple level name formats

//     // Check if the row contains the column you want to split
//     if (row['-46']) { // Not sure why the stage column is named this. It might not be reliable.
//         const value = row['46'];

//         // Example splitting logic based on your format
//         // This assumes the format is always "chapter-stage_difficulty_version"
//         const parts = value.split(' ');
//         const chapterAndStage = parts[0].replace('故事', 'Story').replace('厄险', 'Peril');
//         const [chapter, stage] = chapterAndStage.split('-');
//         const difficulty = parts[1]; // Assuming it's the second part
//         const version = parts[2].replace('Ver', ''); // Assuming it's the third part

//         // Return a new object with the old column removed and new ones added
//         return {
//             ...row, // Spread operator copies all existing properties
//             'chapter': chapter ?? null,
//             'stage': stage ?? null,
//             'difficulty': difficulty ?? null,
//             'version': version ?? null
//         };
//     }

//     // If the column doesn't exist, just return the original row
//     return row;
// };

const processData = async () => {
    // Read the raw CSV
    const records = parse(inputFilePath, { headers: true });
    const finalData = records; // Temporary

    // // Parse the data
    // const parsedData = [];
    // for (const row in records) {
    //   parsedData.push(transformData(row));
    // }

    // // Perform version filtering
    // const mostRecentLevels = {};

    // parsedData.forEach(row => {
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
    fs.writeFileSync(outputFilePath, JSON.stringify(finalData, null, 2), 'utf-8');
    console.log(`Successfully processed and saved data to ${outputFilePath}`);
};

processData().catch(err => {
    console.error('An error occurred during data processing:', err);
    process.exit(1);
});

// //////// TODO list ////////
// store ID mapping
// rename columns, create json
// add command to package
// cleanup README
// check if file can be auto-downloaded using axios or similar. Use manual download for now. Could set it up to dynamically try both, but that's definitely overkill for the moment.
// Validate destination format.
// Validate that we are obtaining enough data to provide a reasonably full menu of options.
// Improve credit given to be closer to the actual planner instead of on the home page?
// Probably implement without file streaming, then can consider adding it later if it provides any value
// Is it worth using typescript? Let's skip while drafting.
// Change @fast-csv/format from runtime to dev or optional dependency

// //// Logic ////
// Make sure levels have a reasonable amount of data backing them up
// Only consider latest version listed per level. Filter out any data that is low confidence.
// Filter out any "blank" rows


