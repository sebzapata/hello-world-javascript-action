const core = require("@actions/core");
const util = require("util");
const fs = require("fs");

try {
  const exec = util.promisify(require("child_process").exec);
  const workingDirectory = "./app";

  const prettyPrintDate = (d) =>
    [
      d.getFullYear(),
      ("0" + (1 + d.getMonth())).substr(-2),
      ("0" + d.getDate()).substr(-2),
    ].join("-");

  const startDate = "2024-12-01T00:00:00.000Z";
  const amountOfWeeksBetweenSamples = 4;
  const nextDate = (date) => {
    const newDate = new Date(date || Date.now());
    newDate.setDate(date.getDate() + amountOfWeeksBetweenSamples * 7);
    return newDate;
  };
  const dates = [];
  const itemsToLookFor = {
    "bright-components": [],
    "@brighthr": [],
    lodash: [],
    enzyme: [],
    "@testing-library/react": [],
    "mobx-react": [],
    "react-query": [],
    "styled-components": [],
    "extends React.Component": [],
  };

  async function findOccurrences(str) {
    let response = {};
    try {
      response = await exec("grep -R '" + str + "'");
    } catch (e) {
      // if there are no occurrences grep will error
    }
    const { stdout } = response;
    return (typeof stdout !== "undefined" ? stdout : "")
      .replaceAll("ts:", "js:")
      .replaceAll("tsx:", "js:")
      .split("js:").length;
  }

  async function go() {
    console.log("process", process);
    process.chdir(workingDirectory);
    await exec("git reset --hard origin/master");
    await checkDates(new Date(startDate));
    const csv = [
      ["", ...dates.map(prettyPrintDate)].join(","),
      ...Object.keys(itemsToLookFor).map((key) => {
        return [key, ...itemsToLookFor[key]].join(",");
      }),
    ].join("\n");
    fs.writeFileSync(__dirname + "/report.csv", csv);
  }

  async function checkDates(date) {
    console.log(`🗓 ${prettyPrintDate(date)}`);
    dates.push(date);
    await exec(
      'git checkout `git rev-list -n 1 --first-parent --before="' +
        date.toISOString() +
        '" master`'
    );
    const results = await Promise.all(
      Object.keys(itemsToLookFor).map(async (key) => {
        const result = await findOccurrences(key);
        itemsToLookFor[key].push(result);
      })
    );
    const _nextDate = nextDate(date);
    if (_nextDate < Date.now()) {
      await checkDates(_nextDate);
    }
  }

  console.log("Started :rocket:");

  go();
} catch (error) {
  core.setFailed(error.message);
}
