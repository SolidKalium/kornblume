# Drop rate importer

Our source is the [必要的记录](https://www.kdocs.cn/l/cd5MWeCl5bKw) project, which collects and aggregates drop rate data. They make this available as CC BY-NC 4.0 and they are given credit in the Credits modal on Kornblume's home page.

## Using the script
- Download the **Episode_rate** tab as a csv from the [必要的记录](https://www.kdocs.cn/l/cd5MWeCl5bKw) project site. This may require a Kingsoft (kdocs / WPS) account.
- Place the csv in the `/scripts/drop_rates/in` folder
- Run the script `npm run stage-process`
- Copy result to `/public/data/stages#_#_greedy.json` and add the insight & resource levels that don't change.
  - In the future, it could be auto-placed inside the project.

## Translations
- 必要的记录 -> Necessary Records (project/spreadsheet title)
- 误差 -> Margin of Error (tab name)
- 数据不足 -> Insufficient Data (cell value)
- 边际误差 -> Marginal Error (column name)
- 上限期望 -> Upper Expectation (column name)
- 故事 (gùshì) -> Story (stage difficulty name)
- 厄险 (èxiǎn) -> Peril or Danger (stage difficulty name)
- 必要的记录 -> Bountiful Harvest (stage name)

## Data fields: Drop Rates
We use the **Episode_rate** tab.
Drop rate data is available on multiple different pages. But this is one that lists all resources for all stages.

- Level name
  - Example: `1-1故事Ver1.0`. Meaning: chapter 1, stage 1, story difficulty, version 1.0
  - Example: `丰收时令1`. Meaning: Bountiful Harvest, stage 1 (this is the set of stages for farming Wilderness upgrade materials)
  - Note that each level+difficulty pair may have entries for multiple versions. In this case, we want the most recent one. Multiple versions are tracked when the items being droppd are updated.
- **cost**: The Activity cost to run the level.
- **isValid**: This might be testing if an IID assumption holds. Essentially: "has the drop rate been consistent over the current window?"
- **times**: How many times the stage was run to get the current statistics
- **isEnough**: I believe this is roughly "is there enough data to trust the statistics?"
- **eff**: Efficiency of the stage. I haven't confirmed the exact details, but it is roughly "how close is the stage to providing maximum value per Activity spent?"
- **边际误差**: Marginal Error. This is likely a 95% confidence interval half width.
- **上限期望**: Upper Expectation. This is likely the upper bound of the 95% confidence interval range.
- Item code number columns: How many copies of the item are expected per run of the stage.
  - The Mapping tab provides the definitions of these item numbers. To avoid duplicating information, the mapping isn't duplicated in this README.

## Misc
- Note: the furthest right column in the Mapping tab is "ALL" (this is an ID, not a word, which happens to be column 1000 (1-indexed)). If that file is ever committed to the repository, make sure it is appropriately trimmed first.
