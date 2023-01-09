import { utils } from 'pixi.js'

export type StyleVariablesMap = Map<string, string | number>

export function getStyleVariablesMap(variablePrefix: string): StyleVariablesMap {
  const styles = new Map()

  const styleVariablesList = getAllPrefixedStyleVariables(variablePrefix)

  styleVariablesList.forEach(([prop, val]) => {
    let convertedValue: string | number

    if (val.startsWith('rgb') || val.startsWith('#')) {
      convertedValue = convertStringToHex(val)
    } else if (val.endsWith('em') || val.endsWith('rem')) {
      convertedValue = convertRemToNumber(val)
    } else {
      convertedValue = val.toString()
    }

    styles.set(prop, convertedValue)
  }, {})

  return styles
}

function getAllPrefixedStyleVariables(variablePrefix: string): (string[])[] {
  // Chrome is the only browser that doesn't include custom properties in the CSSStyleDeclaration object
  // fallow here: https://bugs.chromium.org/p/chromium/issues/detail?id=949807
  // Method lifted from this article: https://css-tricks.com/how-to-get-all-custom-properties-on-a-page-in-javascript/
  return [...document.styleSheets].reduce(
    (finalArr: (string[])[], sheet) => finalArr.concat(
      [...sheet.cssRules].filter<CSSStyleRule>(isStyleRule).reduce((propValArr: (string[])[], rule): (string[])[] => {
        const props = [...rule.style]
          .map((propName) => [
            propName.trim(),
            rule.style.getPropertyValue(propName).trim(),
          ])
          .filter(([propName]) => propName.startsWith(`--${variablePrefix}`))

        return [...propValArr, ...props]
      }, []),
    ),
    [],
  )
}

function isStyleRule(rule: CSSRule): rule is CSSStyleRule {
  return rule.constructor.name === 'CSSStyleRule'
}

function convertStringToHex(color: string): number {
  const trimmedColor = color.trim()

  // FIX THIS
  console.log('#fff', trimmedColor)

  if (trimmedColor.startsWith('rgb')) {
    const [red, green, blue] = trimmedColor.replace(/[^\d,]/g, '').split(',').map((val) => parseInt(val, 10))
    return utils.rgb2hex([red, green, blue])
  }

  return utils.string2hex(trimmedColor)
}

function convertRemToNumber(rem: string): number {
  return parseFloat(rem) * parseFloat(getComputedStyle(document.documentElement).fontSize)
}
