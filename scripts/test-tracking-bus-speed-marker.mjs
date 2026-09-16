import { readFileSync } from "node:fs";

const map = readFileSync("src/tracking/LiveTrackingMap.tsx", "utf8");

const page = readFileSync("src/tracking/TrackingPage.tsx", "utf8");

const css = readFileSync("src/tracking/live-tracking-map.css", "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

check(
  /speedKph\?\s*:\s*number\s*\|\s*null/.test(map),
  "map marker carries live speed",
);

check(
  /formatVehicleSpeed\s*\(/.test(map),
  "vehicle speed has a dedicated formatter",
);

check(
  /data-vehicle-speed/.test(map),
  "bus marker contains a dedicated speed element",
);

check(
  /tracking-map-vehicle__speed/.test(map),
  "bus marker uses dedicated speed badge styling",
);

check(
  /updateVehicleSpeed\s*\(\s*element\s*,\s*marker\.speedKph\s*\)/s.test(map),
  "speed badge updates when realtime GPS changes",
);

check(
  /updateVehicleHeading\s*\(\s*element\s*,\s*marker\.heading\s*\)/s.test(map),
  "heading rotation remains independently updated",
);

check(
  /speedKph\s*:\s*item\.location\.speedKph/.test(page),
  "operational tracking passes realtime speed to the map",
);

check(/\.tracking-map-vehicle__speed/.test(css), "speed badge has map CSS");

check(
  /position:\s*absolute/.test(css),
  "speed badge is positioned independently of bus rotation",
);

console.log("");
console.log("Live bus speed marker checkpoint PASSED");
