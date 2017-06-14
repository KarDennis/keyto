'use strict'

/**
 * Dependencies
 * @ignore
 */
const bignum = require('asn1.js').bignum
const EC = require('elliptic').ec
const ec = new EC('secp256k1')

/**
 * Module Dependencies
 * @ignore
 */
const KeyType = require('./KeyType')
const InvalidOperationError = require('../InvalidOperationError')
const Converter = require('../Converter')
const asn = require('../asn1')

/**
 * ECDSA
 * @class ECDSA
 *
 * @extends {KeyType}
 *
 * @description
 * ECDSA conversion implementation
 */
class ECDSA extends KeyType {

  /**
   * IMPORT
   * @ignore
   */

  fromPrivatePKCS1 (key) {
    let ECPrivateKey = asn.normalize('ECPrivateKey')

    let data = ECPrivateKey.decode(key, 'der')
    let { privateKey: d, publicKey: { data: publicKey } } = data
    let { x, y } = ECDSA.getPoint(publicKey)

    return { d, x, y }
  }

  fromPrivatePKCS8 (key) {
    let PrivateKeyInfo = asn.normalize('PrivateKeyInfo')
    let ECPrivateKey = asn.normalize('ECPrivateKey')

    let info = PrivateKeyInfo.decode(key, 'der')
    let data = ECPrivateKey.decode(info.privateKey, 'der')

    let { privateKey: d, publicKey: { data: publicKey } } = data
    let { x, y } = ECDSA.getPoint(publicKey)

    return { d, x, y }
  }

  fromPublicPKCS8 (key) {
    let PublicKeyInfo = asn.normalize('PublicKeyInfo')

    let info = PublicKeyInfo.decode(key, 'der')
    return ECDSA.getPoint(info.publicKey.data)
  }

  fromJwk (key) {
    let { d, x, y } = key

    return {
      d: Converter.convert(d, 'base64url', 'raw'),
      x: Converter.convert(x, 'base64url', 'raw'),
      y: Converter.convert(y, 'base64url', 'raw'),
    }
  }

  fromBlk (key) {
    let privateKey = ec.keyFromPrivate(key, 'hex')
    let publicKey = privateKey.getPublic()

    return {
      d: Converter.convert(privateKey.priv, 'bn', 'raw'),
      x: Converter.convert(publicKey.getX(), 'bn', 'raw'),
      y: Converter.convert(publicKey.getY(), 'bn', 'raw'),
    }
  }

  /**
   * EXPORT
   * @ignore
   */

  toPrivatePKCS1 (key) {
    let { namedCurve, keyVersion: version } = this.params
    let { d, x, y } = key
    let ECPrivateKey = asn.normalize('ECPrivateKey')

    let publicKey = ECDSA.makePoint(x, y)
    let base64pem = ECPrivateKey.encode({
      version,
      privateKey: d,
      parameters: {
        type: 'namedCurve',
        value: namedCurve.split('.')
      },
      publicKey: {
        unused: 0,
        data: publicKey
      }
    }, 'der').toString('base64')

    return ECDSA.formatPem(base64pem, 'EC PRIVATE')
  }

  toPrivatePKCS8 (key) {
    let { oid, algParameters, keyVersion: version, infoVersion } = this.params
    let { d, x, y } = key
    let PrivateKeyInfo = asn.normalize('PrivateKeyInfo')
    let ECPrivateKey = asn.normalize('ECPrivateKey')

    let publicKey = ECDSA.makePoint(x, y)
    let privateKey = ECPrivateKey.encode({
      version,
      privateKey: d,
      publicKey: {
        unused: 0,
        data: publicKey
      }
    }, 'der')

    let base64pem = PrivateKeyInfo.encode({
      version: infoVersion,
      algorithm: {
        algorithm: oid.split('.'),
        parameters: Buffer.from(algParameters, 'hex')
      },
      privateKey
    }, 'der').toString('base64')

    return ECDSA.formatPem(base64pem, 'PRIVATE')
  }

  toPublicPKCS8 (key) {
    let { oid, algParameters } = this.params
    let { x, y } = key
    let PublicKeyInfo = asn.normalize('PublicKeyInfo')

    let publicKey = ECDSA.makePoint(x, y)
    let base64pem = PublicKeyInfo.encode({
      algorithm: {
        algorithm: oid.split('.'),
        parameters: Buffer.from(algParameters, 'hex')
      },
      publicKey: {
        unused: 0,
        data: publicKey
      }
    }, 'der').toString('base64')

    return ECDSA.formatPem(base64pem, 'PUBLIC')
  }

  toPrivateJwk (key) {
    let { crv, kty } = this.params
    let { d, x, y } = key

    return {
      kty,
      crv,
      d: Converter.convert(d, 'raw', 'base64url'),
      x: Converter.convert(x, 'raw', 'base64url'),
      y: Converter.convert(y, 'raw', 'base64url'),
    }
  }

  toPublicJwk (key) {
    let { crv, kty } = this.params
    let { x, y } = key

    return {
      kty,
      crv,
      x: Converter.convert(x, 'raw', 'base64url'),
      y: Converter.convert(y, 'raw', 'base64url'),
    }
  }

  toBlk (key) {
    return key.d.toString('hex')
  }

  /**
   * HELPERS
   * @ignore
   */

  static getPoint (point) {
    let hexstr = Converter.convert(point, 'raw', 'hex')
    let x = hexstr.slice(2, ((hexstr.length - 2) / 2) + 2)
    let y = hexstr.slice(((hexstr.length - 2) / 2) + 2)
    return Converter.convertObject({ x, y }, 'hex', 'raw')
  }

  static makePoint (x, y) {
    let startBuffer = Buffer.from('04', 'hex')
    return Buffer.concat([
      startBuffer,
      x,
      y
    ], startBuffer.length + x.length + y.length)
  }
}

/**
 * Export
 * @ignore
 */
module.exports = ECDSA
