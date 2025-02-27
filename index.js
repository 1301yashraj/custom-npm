const fs = require("fs");

function readfile() {
  const data = fs.readFileSync("./package.json");
  return JSON.parse(data).dependency;
}

//all  of the dependencies we are using are uploaded on the npm registry so we have to
// fetch them from npm registry

const http = require("https");
function getdata() {
  const dependencies = readfile();
  for (const [pkg, version] of Object.entries(dependencies)) {
    console.log("Forming URL ---------");
    let val = fetchPackagesfromRegistry(pkg, version);
    return val.then((response) => response).catch((error) => console.log("Error : ", error));
  }
}

function fetchPackagesfromRegistry(packageName, version) {
  const url = `https://registry.npmjs.org/${packageName}`;

  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const jsondata = JSON.parse(data);
          if (jsondata.dist && jsondata.dist.tarball) resolve(jsondata.dist.tarball);
          else reject("TRABALL URL NOT PRESENT");
        } catch (error) {
          reject(error);
        }
      });
    });
  });
}

const path = require("path");
let tarballURL = getdata()
  .then((tarballURL) => downloadTarball(tarballURL, "lodash", "4.17.21"))
  .then((filePath) => console.log("Downladed @ ", filePath))
  .catch((error) => console.log(">>Error<< ---", error));

//download the tarball( is a compressed archive file used to package multiple files together)
function downloadTarball(url, packageName, version) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, "node_modules", packageName, `${version}.tgz`);
    //if not present create the directory
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    //get a connection to write into the file
    const file = fs.createWriteStream(filePath);
    http.get(url, (res) => {
      res.pipe(file);
      file
        .on("finish", () => {
          file.close(() => {
            resolve(filePath);
          });
        })
        .on("error", (err) => {
          fs.unlinkSync(filePath);
          reject(err);
        });
    });
  });
}
