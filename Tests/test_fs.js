console.info(__rootDir);
console.info(__dataDir);

function testAccess(path) {
  try {
    fs.access(path, fs.constants.F_OK);
    console.info(`F_OK: ${path}`);
  } catch (e) {
    console.error(e);
  }
}

testAccess('some_data_file.txt'); // in data directory, relative
testAccess(`${__dataDir}/some_data_file.txt`); // same as above, absolute
testAccess(`${__rootDir}/app.js`); // this file in root directory
testAccess(`${__rootDir}/null.js`); // non-existing file
testAccess('C:\\Windows\\System32\\ntdll.dll'); // ABSOLUTELY NOT!
testAccess(`${__dataDir}/../../..`); // ABSOLUTELY NOT!

function testAppendFile(path) {
  try {
    fs.appendFile(path, 'some data\n');
    console.info(`appended to: ${path}`);
  } catch (e) {
    console.error(e);
  }
}

testAppendFile('some_data_file.txt'); // in data directory, relative
testAppendFile(`${__dataDir}/some_data_file.txt`); // same as above, absolute
testAppendFile(`${__dataDir}/../some_data_file.txt`); // ABSOLUTELY NOT!
testAppendFile('new_file.txt'); // creates a new file and appends data

function testCopyFile(src, dest) {
  try {
    fs.copyFile(src, dest);
    console.info(`copied ${src} to ${dest}`);
    fs.rm(dest);
    console.info(`removed ${dest}`);
  } catch (e) {
    console.error(e);
  }
}

testCopyFile('some_data_file.txt', 'another_data_file.txt');
testCopyFile(`${__dataDir}/some_data_file.txt`, `${__dataDir}/../some_data_file.txt`);

try {
  try {
    fs.access('sub', fs.constants.F_OK);
    fs.rmdir('sub');
  } catch (e) { }
  fs.mkdir('sub');
  fs.mkdir('sub/re/cur/sive');
} catch (e) {
  console.error(e);
}

function testOpendir(path) {
  try {
    const dir = fs.opendir(path);
    console.info(`opened ${dir.path}`);
    let dirent = dir.read();
    while (dirent) {
      const typeString = dirent.isDirectory ? 'directory' : (dirent.isFile ? 'file' : 'unknown');
      console.info(`${dirent.parentPath} + ${dirent.name} is ${typeString}`);
      dirent = dir.read();
    }
  } catch (e) {
    console.error(e);
  }
}
console.info('test opendir');
testOpendir('sub');
testOpendir('sub/re/cur/sive');
testOpendir(4);
testOpendir('.');
testOpendir(__rootDir);

try {
  const o = {
    hello: "world",
    fruits: ['apple', 'orange', 'banana'],
    bool: true,
    anotherObject: {
      recursive: 'yes',
    },
  };
  fs.writeFile('some.json', JSON.stringify(o));
  const data = JSON.parse(fs.readFile('some.json'));
  // output: {"hello":"world","fruits":["apple","orange","banana"],"bool":true,"anotherObject":{"recursive":"yes"}}
  console.info(JSON.stringify(data));
} catch (e) {
  console.error(e);
}

Object.defineProperty(Object.getPrototypeOf(fs.Dirent), 'type', {
  get() {
    return this.isDirectory ? 'directory' : (this.isFile ? 'file' : 'unknown');
  }
});

try {
  const files = fs.readdir('.');
  for (let file of files) {
    console.info(`${file.parentPath} + ${file.name} is ${file.type}`);
  }
} catch (e) {
  console.error(e);
}
