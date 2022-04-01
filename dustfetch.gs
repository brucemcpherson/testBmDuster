const dustfetchA = () => {

  // start with this object
  const originalObject = UrlFetchApp

  // set a default method
  const dustFetch = bmDuster.proxyDust({ originalObject, defaultMethod: originalObject.fetch })

  // now we can do this
  const endPoint = 'https://people.googleapis.com/v1/'
  const url = 'people/me?personFields=names,emailAddresses'

  console.log(dustFetch(endPoint + url, {
    headers: {
      authorization: 'Bearer ' + ScriptApp.getOAuthToken()
    }
  }).getContentText())

}

const dustfetchB = () => {

  // start with this object
  const originalObject = UrlFetchApp

  // the base endpoint
  const endPoint = 'https://people.googleapis.com/v1/'

  // the applyAction adds the auth header and the base url
  const applyAction = (target, thisArg, ...args) => {
    // the arguments to fetch
    let [url, options = {}] = args
    url = endPoint + url
    let { headers = {} } = options
    headers.authorization = 'Bearer ' + ScriptApp.getOAuthToken()
    options = {
      ...options,
      headers
    }
    return target.apply(thisArg, [url, options])
  }

  // set a default method
  const dustFetch = bmDuster.proxyDust({
    originalObject,
    defaultMethod: originalObject.fetch,
    applyAction
  })

  // now every time we need to call the api we can just do this
  console.log(dustFetch('people/me?personFields=names,emailAddresses').getContentText())

}

const dustfetchC = () => {

  // start with this object
  const originalObject = UrlFetchApp

  // the base endpoint
  const endPoint = 'https://people.googleapis.com/v1/'

  // the applyAction adds the auth header and the base url
  const applyAction = (target, thisArg, ...args) => {
    // the arguments to fetch
    let [url, options = {}] = args
    url = endPoint + url
    let { headers = {} } = options
    headers.authorization = 'Bearer ' + ScriptApp.getOAuthToken()
    options = {
      ...options,
      headers,
      muteHttpExceptions: true
    }
    // we'll execute the thing and deal with the response
    const response = target.apply(thisArg, [url, options])

    // we'll make a data packet of the response
    const pack = {
      response,
      data: null,
      error: null,
      parsed: false
    }
    // see if it was successful
    if (Math.floor(1 + response.getResponseCode() / 200) === 2) {
      // parse if successful
      try {
        pack.data = JSON.parse(response.getContentText())
        pack.parsed = true
      } catch (error) {
        pack.error = error
      }
    } else {
      console.log(response.getResponseCode(), Math.floor(response.getResponseCode() / 200))
      pack.error = response.getContentText()
    }
    // add a throw method shortcut
    pack.throw = pack.error
      ? () => {
        throw new Error(pack.error)
      }
      : () => pack
    return pack
  }

  // set a default method
  const dustFetch = bmDuster.proxyDust({
    originalObject,
    defaultMethod: originalObject.fetch,
    applyAction
  })

  // now every time we need to call the api we can just do this
  console.log(dustFetch('people/me?personFields=names,emailAddresses').data)

  // or if you want to throw an error if one is detected 
  console.log(dustFetch('people/me?personFields=names,emailAddresses').throw().data)

}

const dustfetchD = () => {

  // start with this object
  const originalObject = UrlFetchApp

  // the base endpoint
  const endPoint = 'https://people.googleapis.com/v1/'


  // create a caching routine
  const cacher = {
    // the cache to use
    cachePoint: CacheService.getUserCache(),
    expiry: 60 * 60 * 1000,
    // create a key from arbitrary args
    digester() {
      // conver args to an array and digest them
      const t = Array.prototype.slice.call(arguments).map(function (d) {
        return (Object(d) === d) ? JSON.stringify(d) : d.toString();
      }).join("-")
      const s = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, t, Utilities.Charset.UTF_8)
      return Utilities.base64EncodeWebSafe(s)
    },

    cacheable(options) {
      const method = (options.method || "get").toLowerCase()
      return method === "get"
    },

    getter(url, options = {}) {
      if (!this.cacheable(options)) return null

      // we'll just use the url to base the key on - could be fancier with some options too
      const data = this.cachePoint.get(this.digester(url))
      return data ? JSON.parse(data) : null
    },

    setter(url, options = {}, data) {
      if (!this.cacheable(options)) return null
      // we'll just use the url to base the key on - could be fancier with some options too
      return this.cachePoint.put(this.digester(url), JSON.stringify(data), this.expiry)
    }
  }

  // the applyAction adds the auth header and the base url
  const applyAction = (target, thisArg, ...args) => {
    // the arguments to fetch
    let [url, options = {}] = args
    url = endPoint + url
    let { headers = {} } = options
    headers.authorization = 'Bearer ' + ScriptApp.getOAuthToken()
    options = {
      ...options,
      headers,
      muteHttpExceptions: true
    }

    // lets see if we can get it from cache
    const cached = cacher.getter(url, options)

    // we'll make a data packet of the response
    const pack = {
      response: null,
      data: null,
      error: null,
      parsed: false,
      cached: Boolean(cached)
    }
    if (pack.cached) {
      pack.data = cached
    } else {
      // we'll execute the thing and deal with the response
      pack.response = target.apply(thisArg, [url, options])

      // see if it was successful
      if (Math.floor(1 + pack.response.getResponseCode() / 200) === 2) {
        // parse if successful
        try {
          pack.data = JSON.parse(pack.response.getContentText())
          pack.parsed = true
          // write it to cache for next time
          cacher.setter(url, options, pack.data)
        } catch (error) {
          pack.error = error
        }
      } else {
        pack.error = pack.response.getContentText()
      }
    }
    // add a throw method shortcut
    pack.throw = pack.error
      ? () => {
        throw new Error(pack.error)
      }
      : () => pack
    return pack
  }

  // set a default method
  const dustFetch = bmDuster.proxyDust({
    originalObject,
    defaultMethod: originalObject.fetch,
    applyAction
  })

  // now every time we need to call the api we can just do this
  console.log(dustFetch('people/me?personFields=names,emailAddresses').data)

  // or if you want to throw an error if one is detected 
  console.log(dustFetch('people/me?personFields=names,emailAddresses').throw().data)

  // we can see if came from cache
  const { data, cached } = dustFetch('people/me?personFields=names,emailAddresses').throw()
  console.log(data, cached)

}