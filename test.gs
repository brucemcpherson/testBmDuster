const testProxy = () => {
  // start with this object
  const originalObject = {
    countArgs: (...args) => args.length,
    stringArgs: (...args) => JSON.stringify(args),
  };
  // set a default method
  const dust = bmDuster.proxyDust({ originalObject, defaultMethod: originalObject.countArgs })

  // now we can do this
  console.log(dust(1, 2, 3)) // 3

  // and this
  console.log(dust.countArgs(1, 2, 3)) // 3

  // and this
  console.log(dust.stringArgs(1, 2, 3)) // [1,2,3]

  // and this
  console.log(dust.nonsense)
  /*
  Error	
    Invalid property: Attempt to access missing property nonsense
    UnknownPropertyError	@ errors.gs:3
    missingPropAction	@ proxying.gs:28
    get	@ proxying.gs:57
 */

}

const testDifferently = () => {
  const originalObject = {
    countArgs: (...args) => args.length,
    stringArgs: (...args) => JSON.stringify(args),
  };
  const dustDifferently = bmDuster.proxyDust({
    originalObject, defaultMethod: (...args) => console.log('you called the default function with these args', ...args)
  })
  dustDifferently('hello there')
}
const duster = () => {

  // process the results once
  const results = ({ value, operation = bmDuster.equals }, ...args) => args.flat(Infinity).map((f) => operation(f, value));

  // the basic object
  const originalObject = {
    every: ({ operation, value }, ...args) => results({ operation, value }, ...args).every((f) => f),
    some: ({ operation, value }, ...args) => results({ operation, value }, ...args).some((f) => f),
    none: ({ operation, value }, ...args) => results({ operation, value }, ...args).every((f) => !f),
    partial: ({ operation, value }, ...args) => results({ operation, value }, ...args).some(f => f) &&
      !results({ operation, value }, ...args).every(f => f),
    list: ({ operation, value }, ...args) => results({ operation, value }, ...args),
  };


  return bmDuster.proxyDust({ originalObject, defaultMethod: originalObject.every })


}

const checker = (testNumber, expect, actual) => {
  if (!bmDuster.equals(expect, actual)) {
    console.log(`${testNumber}`, bmDuster.newUnexpectedValueError(expect, actual))
    return false
  }
  console.log(`${testNumber} passed: ${JSON.stringify(actual)}`)
  return true
}

const tester = () => {

  // comparisons I
  // various tests for null
  const compare = duster()
  let testNumber = 0
  checker(++testNumber, true, compare({ value: null }, null))
  checker(++testNumber, false, compare({ value: null }, 123))
  checker(++testNumber, false, compare({ value: null }, undefined))
  checker(++testNumber, true, compare({ value: null }, null, null))
  checker(++testNumber, false, compare({ value: null }, null, 99))
  checker(++testNumber, false, compare.every({ value: null }, null, 99))
  checker(++testNumber, true, compare.some({ value: null }, null, 99))
  checker(++testNumber, false, compare.partial({ value: 99 }, 99, 99))
  checker(++testNumber, [false, true], compare.list({ value: 99 }, 100, 99))
  checker(++testNumber, false, compare.none({ value: 99 }, 100, 99))
  checker(++testNumber, true, compare.none({ value: 99 }, 12, 'eggs', 56))
  checker(++testNumber, false, compare.some({ value: 99 }, 12, 'eggs', '99'))
  checker(++testNumber, true, compare.some({ value: 99 }, 12, 'eggs', 99))

  checker(++testNumber, false, compare({ value: { name: 'john' } }, 12, 'eggs', 99))
  checker(++testNumber, true, compare.partial({ value: { name: 'john', id: 123 } }, 12, 'eggs', { name: 'john', id: 123 }))
  checker(++testNumber, true, compare.every({ value: { name: 'john', id: 123 } }, { name: 'john', id: 123 }, { name: 'john', id: 123 }, { name: 'john', id: 123 }))
  checker(++testNumber, true, compare.partial({ value: { name: 'john', id: 123 } }, { name: 'fred', id: 123 }, { name: 'john', id: 123 }, { name: 'john', id: 123 }))

  checker(++testNumber, [true, false], compare.list({ value: new Set (['a','b']) }, new Set(['a','b']), new Set(['b','c'])))
  checker(++testNumber, [true, false], compare.list({ value: new Map ([['a','b'],['c','d']])}, new Map ([['a','b'],['c','d']]), new Map ([['a','b']])))

}