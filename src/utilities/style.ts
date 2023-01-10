import { default as cssColorNamesUntyped } from 'css-color-names'

export type StyleVariablesMap = Map<string, string | number>

const cssColorNames = cssColorNamesUntyped as Record<string, string>

export function getStyleVariablesMap(variablePrefix: string): StyleVariablesMap {
  const styles = new Map()

  const styleVariablesList = getAllPrefixedStyleVariables(variablePrefix)

  styleVariablesList.forEach(([prop, val]) => {
    let convertedValue: string | number

    if (val.startsWith('rgb') || val.startsWith('#') || cssColorNames[val]) {
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
  // follow here: https://bugs.chromium.org/p/chromium/issues/detail?id=949807
  // Method lifted from this article: https://css-tricks.com/how-to-get-all-custom-properties-on-a-page-in-javascript/
  return [...document.styleSheets].reduce(
    (finalArr: (string[])[], sheet) => finalArr.concat(
      [...sheet.cssRules].filter<CSSStyleRule>(isStyleRule).reduce((propValArr: (string[])[], rule): (string[])[] => {
        const allCSSProps = [...rule.style]
          .map((propName) => [
            propName.trim(),
            rule.style.getPropertyValue(propName).trim(),
          ])

        const propsWithPrefix = allCSSProps
          .filter(([propName]) => propName.startsWith(`--${variablePrefix}`))
          .map((prop) => {
            // handle props assigned to other variables
            const [key, value] = prop
            if (value.startsWith('var(')) {
              const resolvedValue = resolveCssVariableAssignment(value, allCSSProps)
              if (resolvedValue) {
                prop[1] = resolvedValue
              }
            }

            return prop
          })

        return [...propValArr, ...propsWithPrefix]
      }, []),
    ),
    [],
  )
}

function resolveCssVariableAssignment(value: string, allCSSProps: (string[])[]): string | undefined {
  const [valueVariableName, fallback] = value.replace('var(', '').replace(')', '').split(', ')
  const variableValue = allCSSProps.find(([propName]) => propName === valueVariableName)

  if (!variableValue) {
    return fallback
  }

  if (variableValue[1].startsWith('var(')) {
    return resolveCssVariableAssignment(variableValue[1], allCSSProps)
  }

  return variableValue[1]
}

function isStyleRule(rule: CSSRule): rule is CSSStyleRule {
  return rule.constructor.name === 'CSSStyleRule'
}

function convertStringToHex(color: string): number {
  const trimmedColor = color.trim()

  if (trimmedColor.startsWith('rgb')) {
    const [red, green, blue] = trimmedColor.replace(/[^\d,]/g, '').split(',').map((val) => parseInt(val, 10))
    return rgb2hex([red, green, blue])
  }

  return string2hex(trimmedColor)
}

function convertRemToNumber(rem: string): number {
  return parseFloat(rem) * parseFloat(getComputedStyle(document.documentElement).fontSize)
}

function string2hex(string: string): number {
  // @TODO: Once we update to v7, PIXI.utils.string2hex can handle this
  // ticket to update to v7: https://github.com/PrefectHQ/graphs/issues/49
  // lifted from https://github.com/pixijs/pixijs/blob/dev/packages/utils/src/color/hex.ts
  if (typeof string === 'string') {
    string = (cssColorNames as Record<string, string>)[string.toLowerCase()] || string

    if (string.startsWith('#')) {
      string = string.slice(1)
    }

    if (string.length === 3) {
      const [red, green, blue] = string

      string = red + red + green + green + blue + blue
    }
  }

  return parseInt(string, 16)
}

function rgb2hex(rgb: number[] | Float32Array): number {
  return parseInt((1 << 24 | rgb[0] << 16 | rgb[1] << 8 | rgb[2]).toString(16).slice(1), 16)
}
