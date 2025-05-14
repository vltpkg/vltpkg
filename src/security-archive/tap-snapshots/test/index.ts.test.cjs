/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/index.ts > TAP > SecurityArchive.refresh > should have persisted the API response into the database 1`] = `
Object {
  "··@ruyadorno§foo@1.0.0": Object {
    "alerts": Array [],
    "author": Array [
      "ruyadorno",
    ],
    "batchIndex": 1,
    "id": "99923218962",
    "license": "MIT",
    "licenseDetails": Array [],
    "name": "foo",
    "namespace": "@ruyadorno",
    "score": Object {
      "license": 1,
      "maintenance": 0.84,
      "overall": 0.93,
      "quality": 0.83,
      "supplyChain": 0.99,
      "vulnerability": 1,
    },
    "size": 13003,
    "type": "npm",
    "version": "1.0.0",
  },
  "··english-days@1.0.0": Object {
    "alerts": Array [
      Object {
        "category": "maintenance",
        "key": "QG35N0uHm_B_BG4Bc_OlJW3rR2XiTPlFZMNZjm-G1Ufg",
        "props": Object {
          "lastPublish": "2016-02-17T02:52:33.918Z",
        },
        "severity": "low",
        "type": "unmaintained",
      },
      Object {
        "category": "supplyChainRisk",
        "key": "Q2JOM20TNSY962_q6c1goNPMN46sXiFfk0X_8YrIplsU",
        "props": Object {
          "linesOfCode": 9,
        },
        "severity": "middle",
        "type": "trivialPackage",
      },
      Object {
        "category": "quality",
        "key": "Q1hdrp66HKyFF0sBwU7tGypHUBcwpNViZKOQHEKyvIMo",
        "severity": "middle",
        "type": "unpopularPackage",
      },
    ],
    "author": Array [
      "wesleytodd",
    ],
    "batchIndex": 0,
    "id": "15713076833",
    "license": "ISC",
    "licenseDetails": Array [],
    "name": "english-days",
    "score": Object {
      "license": 1,
      "maintenance": 0.75,
      "overall": 0.78,
      "quality": 0.55,
      "supplyChain": 0.6,
      "vulnerability": 1,
    },
    "size": 1632,
    "type": "npm",
    "version": "1.0.0",
  },
}
`

exports[`test/index.ts > TAP > SecurityArchive.refresh > should have removed the borked entry from the database 1`] = `
Object {
  "··english-days@1.0.0": Object {
    "alerts": Array [
      Object {
        "category": "maintenance",
        "key": "QG35N0uHm_B_BG4Bc_OlJW3rR2XiTPlFZMNZjm-G1Ufg",
        "props": Object {
          "lastPublish": "2016-02-17T02:52:33.918Z",
        },
        "severity": "low",
        "type": "unmaintained",
      },
      Object {
        "category": "supplyChainRisk",
        "key": "Q2JOM20TNSY962_q6c1goNPMN46sXiFfk0X_8YrIplsU",
        "props": Object {
          "linesOfCode": 9,
        },
        "severity": "middle",
        "type": "trivialPackage",
      },
      Object {
        "category": "quality",
        "key": "Q1hdrp66HKyFF0sBwU7tGypHUBcwpNViZKOQHEKyvIMo",
        "severity": "middle",
        "type": "unpopularPackage",
      },
    ],
    "author": Array [
      "wesleytodd",
    ],
    "batchIndex": 0,
    "id": "15713076833",
    "license": "ISC",
    "licenseDetails": Array [],
    "name": "english-days",
    "score": Object {
      "license": 1,
      "maintenance": 0.75,
      "overall": 0.78,
      "quality": 0.55,
      "supplyChain": 0.6,
      "vulnerability": 1,
    },
    "size": 1632,
    "type": "npm",
    "version": "1.0.0",
  },
}
`

exports[`test/index.ts > TAP > SecurityArchive.refresh > should output a JSON representation of the current archive 1`] = `
Object {
  "··@ruyadorno§foo@1.0.0": Object {
    "alerts": Array [],
    "author": Array [
      "ruyadorno",
    ],
    "batchIndex": 1,
    "id": "99923218962",
    "license": "MIT",
    "licenseDetails": Array [],
    "name": "foo",
    "namespace": "@ruyadorno",
    "score": Object {
      "license": 1,
      "maintenance": 0.84,
      "overall": 0.93,
      "quality": 0.83,
      "supplyChain": 0.99,
      "vulnerability": 1,
    },
    "size": 13003,
    "type": "npm",
    "version": "1.0.0",
  },
  "··english-days@1.0.0": Object {
    "alerts": Array [
      Object {
        "category": "maintenance",
        "key": "QG35N0uHm_B_BG4Bc_OlJW3rR2XiTPlFZMNZjm-G1Ufg",
        "props": Object {
          "lastPublish": "2016-02-17T02:52:33.918Z",
        },
        "severity": "low",
        "type": "unmaintained",
      },
      Object {
        "category": "supplyChainRisk",
        "key": "Q2JOM20TNSY962_q6c1goNPMN46sXiFfk0X_8YrIplsU",
        "props": Object {
          "linesOfCode": 9,
        },
        "severity": "middle",
        "type": "trivialPackage",
      },
      Object {
        "category": "quality",
        "key": "Q1hdrp66HKyFF0sBwU7tGypHUBcwpNViZKOQHEKyvIMo",
        "severity": "middle",
        "type": "unpopularPackage",
      },
    ],
    "author": Array [
      "wesleytodd",
    ],
    "batchIndex": 0,
    "id": "15713076833",
    "license": "ISC",
    "licenseDetails": Array [],
    "name": "english-days",
    "score": Object {
      "license": 1,
      "maintenance": 0.75,
      "overall": 0.78,
      "quality": 0.55,
      "supplyChain": 0.6,
      "vulnerability": 1,
    },
    "size": 1632,
    "type": "npm",
    "version": "1.0.0",
  },
}
`
