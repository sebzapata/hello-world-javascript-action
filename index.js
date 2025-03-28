const core = require("@actions/core");
const path = require("path");
const util = require("util");
const fs = require("fs");

try {
  const exec = util.promisify(require("child_process").exec);

  // const workingDirectory = "../WebApp/app";
  const workingDirectory = "../";

  const prettyPrintDate = (d) =>
    [
      d.getFullYear(),
      `0${1 + d.getMonth()}`.substr(-2),
      `0${d.getDate()}`.substr(-2),
    ].join("-");

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
      response = await exec(`grep -R '${str}'`);
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
    // process.chdir(workingDirectory);

    await checkDates(new Date());
    const csv = [
      ["", ...dates.map(prettyPrintDate)].join(","),
      ...Object.keys(itemsToLookFor).map((key) => {
        return [key, ...itemsToLookFor[key]].join(",");
      }),
    ].join("\n");
    console.log("csv", csv);

    fs.writeFileSync(`${__dirname}/report.csv`, csv);
  }

  async function checkDates(date) {
    console.log(`🗓 ${prettyPrintDate(date)}`);
    dates.push(date);

    await Promise.all(
      Object.keys(itemsToLookFor).map(async (key) => {
        const result = await findOccurrences(key);
        itemsToLookFor[key].push(result);
      })
    );
  }

  console.log("Started 🚀");

  go();
} catch (error) {
  core.setFailed(error.message);
}
