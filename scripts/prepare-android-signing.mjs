import { readFile, writeFile } from 'node:fs/promises'

const gradlePath = process.argv[2] ?? 'src-tauri/gen/android/app/build.gradle.kts'
let gradle = await readFile(gradlePath, 'utf8')

if (!gradle.includes('import java.io.FileInputStream')) {
  const propertiesImport = 'import java.util.Properties'
  if (!gradle.includes(propertiesImport)) {
    throw new Error(`Could not find the Android Properties import in ${gradlePath}`)
  }
  gradle = gradle.replace(
    propertiesImport,
    `import java.io.FileInputStream\n${propertiesImport}`,
  )
}

if (!gradle.includes('signingConfigs.getByName("release")')) {
  const buildTypesMarker = '    buildTypes {'
  if (!gradle.includes(buildTypesMarker)) {
    throw new Error(`Could not find the Android buildTypes block in ${gradlePath}`)
  }

  const signingConfig = `    signingConfigs {\n        create("release") {\n            val keystorePropertiesFile = rootProject.file("keystore.properties")\n            val keystoreProperties = Properties()\n            if (keystorePropertiesFile.exists()) {\n                keystoreProperties.load(FileInputStream(keystorePropertiesFile))\n            }\n            keyAlias = keystoreProperties["keyAlias"] as String\n            keyPassword = keystoreProperties["password"] as String\n            storeFile = file(keystoreProperties["storeFile"] as String)\n            storePassword = keystoreProperties["password"] as String\n            storeType = keystoreProperties["storeType"] as String?\n        }\n    }\n\n`
  gradle = gradle.replace(buildTypesMarker, `${signingConfig}${buildTypesMarker}`)
}

const releaseMarker = '        getByName("release") {'
if (!gradle.includes(releaseMarker)) {
  throw new Error(`Could not find the Android release build type in ${gradlePath}`)
}

if (!gradle.includes('signingConfig = signingConfigs.getByName("release")')) {
  gradle = gradle.replace(
    releaseMarker,
    `${releaseMarker}\n            signingConfig = signingConfigs.getByName("release")`,
  )
}

await writeFile(gradlePath, gradle)
console.log(`Configured Android release signing in ${gradlePath}`)
