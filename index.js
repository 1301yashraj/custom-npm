const fs = require("fs");
const https = require("https");
const path = require("path");

// Fetch all dependencies
function getdata() {
  const dependencies = readfile();
  const promises = Object.entries(dependencies).map(([pkg, version]) => fetchPackagesfromRegistry(pkg, version));
  return Promise.all(promises);
}

// Read package.json and return dependencies
function readfile() {
  const data = fs.readFileSync("./package.json");
  return JSON.parse(data).dependencies;
}

// Fetch tarball URLs from NPM registry
function fetchPackagesfromRegistry(packageName, version) {
  const url = `https://registry.npmjs.org/${packageName}`;
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const jsondata = JSON.parse(data);
            if (jsondata.versions && jsondata.versions[version] && jsondata.versions[version].dist.tarball) {
              resolve(jsondata.versions[version].dist.tarball);
            } else {
              reject(`Tarball URL not found for ${packageName}@${version}`);
            }
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

// Run
getdata()
  .then((urls) => {
    console.log("Downloading tarballs...");
    return Promise.all(
      urls.map((url, i) => downloadTarball(url, Object.keys(readfile())[i], Object.values(readfile())[i]))
    );
  })
  .then((filePaths) => console.log("Downloaded @", filePaths))
  .catch((error) => console.error(">> Error <<", error));

// Download tarball
function downloadTarball(url, packageName, version) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, "node_modules", packageName, `${version}.tgz`);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const file = fs.createWriteStream(filePath);

    https
      .get(url, (res) => {
        res.pipe(file);
        file.on("finish", () => {
          file.close(() => resolve(filePath));
        });
      })
      .on("error", (err) => {
        fs.unlinkSync(filePath);
        reject(err);
      });
  });
}
