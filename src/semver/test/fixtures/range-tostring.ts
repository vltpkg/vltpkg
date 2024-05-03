// range, toString, includePrerelease toString
export default [
  ['1.0.0 - 2.0.0', '>=1.0.0 <=2.0.0', '>=1.0.0-0 <=2.0.0'],
  [
    '^1.2.3+build',
    '>=1.2.3+build <2.0.0-0',
    '>=1.2.3-0+build <2.0.0-0',
  ],
  [
    '^1.2.3+build',
    '>=1.2.3+build <2.0.0-0',
    '>=1.2.3-0+build <2.0.0-0',
  ],
  [
    '1.2.3-pre+asdf - 2.4.3-pre+asdf',
    '>=1.2.3-pre+asdf <=2.4.3-pre+asdf',
    '>=1.2.3-pre+asdf <=2.4.3-pre+asdf',
  ],
  [
    '1.2.3-pre+asdf - 2.4.3-pre+asdf',
    '>=1.2.3-pre+asdf <=2.4.3-pre+asdf',
    '>=1.2.3-pre+asdf <=2.4.3-pre+asdf',
  ],
  [
    '1.2.3-pre+asdf - 2.4.3-pre+asdf',
    '>=1.2.3-pre+asdf <=2.4.3-pre+asdf',
    '>=1.2.3-pre+asdf <=2.4.3-pre+asdf',
  ],
  [
    '1.2.3+asdf - 2.4.3+asdf',
    '>=1.2.3+asdf <=2.4.3+asdf',
    '>=1.2.3-0+asdf <=2.4.3+asdf',
  ],
  ['1.0.0', '1.0.0', '1.0.0'],
  ['>=*', '*', '*'],
  ['', '*', '*'],
  ['*', '*', '*'],
  ['>=1.0.0', '>=1.0.0', '>=1.0.0-0'],
  ['>=1.0.0', '>=1.0.0', '>=1.0.0-0'],
  ['>=1.0.0', '>=1.0.0', '>=1.0.0-0'],
  ['>1.0.0', '>1.0.0', '>1.0.0'],
  ['>1.0.0', '>1.0.0', '>1.0.0'],
  ['<=2.0.0', '<=2.0.0', '<=2.0.0'],
  ['<=2.0.0', '<=2.0.0', '<=2.0.0'],
  ['<=2.0.0', '<=2.0.0', '<=2.0.0'],
  ['<2.0.0', '<2.0.0', '<2.0.0-0'],
  ['<2.0.0', '<2.0.0', '<2.0.0-0'],
  ['>= 1.0.0', '>=1.0.0', '>=1.0.0-0'],
  ['>=  1.0.0', '>=1.0.0', '>=1.0.0-0'],
  ['>=   1.0.0', '>=1.0.0', '>=1.0.0-0'],
  ['> 1.0.0', '>1.0.0', '>1.0.0'],
  ['>  1.0.0', '>1.0.0', '>1.0.0'],
  ['<=   2.0.0', '<=2.0.0', '<=2.0.0'],
  ['<= 2.0.0', '<=2.0.0', '<=2.0.0'],
  ['<=  2.0.0', '<=2.0.0', '<=2.0.0'],
  ['<    2.0.0', '<2.0.0', '<2.0.0-0'],
  ['<\t2.0.0', '<2.0.0', '<2.0.0-0'],
  ['>=0.1.97', '>=0.1.97', '>=0.1.97-0'],
  ['0.1.20 || 1.2.4', '0.1.20 || 1.2.4', '0.1.20 || 1.2.4'],
  ['>=0.2.3 || <0.0.1', '>=0.2.3 || <0.0.1', '>=0.2.3-0 || <0.0.1-0'],
  ['>=0.2.3 || <0.0.1', '>=0.2.3 || <0.0.1', '>=0.2.3-0 || <0.0.1-0'],
  ['>=0.2.3 || <0.0.1', '>=0.2.3 || <0.0.1', '>=0.2.3-0 || <0.0.1-0'],
  ['||', '* || *', '* || *'],
  ['2.x.x', '>=2.0.0 <3.0.0-0', '>=2.0.0-0 <3.0.0-0'],
  ['1.2.x', '>=1.2.0 <1.3.0-0', '>=1.2.0-0 <1.3.0-0'],
  [
    '1.2.x || 2.x',
    '>=1.2.0 <1.3.0-0 || >=2.0.0 <3.0.0-0',
    '>=1.2.0-0 <1.3.0-0 || >=2.0.0-0 <3.0.0-0',
  ],
  [
    '1.2.x || 2.x',
    '>=1.2.0 <1.3.0-0 || >=2.0.0 <3.0.0-0',
    '>=1.2.0-0 <1.3.0-0 || >=2.0.0-0 <3.0.0-0',
  ],
  ['x', '*', '*'],
  ['2.*.*', '>=2.0.0 <3.0.0-0', '>=2.0.0-0 <3.0.0-0'],
  ['1.2.*', '>=1.2.0 <1.3.0-0', '>=1.2.0-0 <1.3.0-0'],
  [
    '1.2.* || 2.*',
    '>=1.2.0 <1.3.0-0 || >=2.0.0 <3.0.0-0',
    '>=1.2.0-0 <1.3.0-0 || >=2.0.0-0 <3.0.0-0',
  ],
  [
    '1.2.* || 2.*',
    '>=1.2.0 <1.3.0-0 || >=2.0.0 <3.0.0-0',
    '>=1.2.0-0 <1.3.0-0 || >=2.0.0-0 <3.0.0-0',
  ],
  ['*', '*', '*'],
  ['2', '>=2.0.0 <3.0.0-0', '>=2.0.0-0 <3.0.0-0'],
  ['2.3', '>=2.3.0 <2.4.0-0', '>=2.3.0-0 <2.4.0-0'],
  ['~0.0.1', '>=0.0.1 <0.1.0-0', '>=0.0.1-0 <0.1.0-0'],
  ['~0.0.1', '>=0.0.1 <0.1.0-0', '>=0.0.1-0 <0.1.0-0'],
  ['~x', '*', '*'],
  ['~2', '>=2.0.0 <3.0.0-0', '>=2.0.0-0 <3.0.0-0'],
  ['~2.4', '>=2.4.0 <2.5.0-0', '>=2.4.0-0 <2.5.0-0'],
  ['~2.4', '>=2.4.0 <2.5.0-0', '>=2.4.0-0 <2.5.0-0'],
  ['~>3.2.1', '>=3.2.1 <3.3.0-0', '>=3.2.1-0 <3.3.0-0'],
  ['~1', '>=1.0.0 <2.0.0-0', '>=1.0.0-0 <2.0.0-0'],
  ['~>1', '>=1.0.0 <2.0.0-0', '>=1.0.0-0 <2.0.0-0'],
  ['~> 1', '>=1.0.0 <2.0.0-0', '>=1.0.0-0 <2.0.0-0'],
  ['~1.0', '>=1.0.0 <1.1.0-0', '>=1.0.0-0 <1.1.0-0'],
  ['~ 1.0', '>=1.0.0 <1.1.0-0', '>=1.0.0-0 <1.1.0-0'],
  ['~ 1.0.3', '>=1.0.3 <1.1.0-0', '>=1.0.3-0 <1.1.0-0'],
  ['>=1', '>=1.0.0', '>=1.0.0-0'],
  ['>= 1', '>=1.0.0', '>=1.0.0-0'],
  ['<1.2', '<1.2.0', '<1.2.0-0'],
  ['< 1.2', '<1.2.0', '<1.2.0-0'],
  ['=0.7.x', '>=0.7.0 <0.8.0-0', '>=0.7.0-0 <0.8.0-0'],
  ['<=0.7.x', '<0.8.0-0', '<0.8.0-0'],
  ['>=0.7.x', '>=0.7.0', '>=0.7.0-0'],
  ['<=0.7.x', '<0.8.0-0', '<0.8.0-0'],
  [
    '~1.2.1 >=1.2.3',
    '>=1.2.1 <1.3.0-0 >=1.2.3',
    '>=1.2.1-0 <1.3.0-0 >=1.2.3-0',
  ],
  [
    '~1.2.1 =1.2.3',
    '>=1.2.1 <1.3.0-0 1.2.3',
    '>=1.2.1-0 <1.3.0-0 1.2.3',
  ],
  [
    '~1.2.1 1.2.3',
    '>=1.2.1 <1.3.0-0 1.2.3',
    '>=1.2.1-0 <1.3.0-0 1.2.3',
  ],
  [
    '~1.2.1 >=1.2.3 1.2.3',
    '>=1.2.1 <1.3.0-0 >=1.2.3 1.2.3',
    '>=1.2.1-0 <1.3.0-0 >=1.2.3-0 1.2.3',
  ],
  [
    '~1.2.1 1.2.3 >=1.2.3',
    '>=1.2.1 <1.3.0-0 1.2.3 >=1.2.3',
    '>=1.2.1-0 <1.3.0-0 1.2.3 >=1.2.3-0',
  ],
  ['>=1.2.1 1.2.3', '>=1.2.1 1.2.3', '>=1.2.1-0 1.2.3'],
  ['1.2.3 >=1.2.1', '1.2.3 >=1.2.1', '1.2.3 >=1.2.1-0'],
  ['>=1.2.3 >=1.2.1', '>=1.2.3 >=1.2.1', '>=1.2.3-0 >=1.2.1-0'],
  ['>=1.2.1 >=1.2.3', '>=1.2.1 >=1.2.3', '>=1.2.1-0 >=1.2.3-0'],
  ['>=1.2', '>=1.2.0', '>=1.2.0-0'],
  ['^1.2.3', '>=1.2.3 <2.0.0-0', '>=1.2.3-0 <2.0.0-0'],
  ['^0.1.2', '>=0.1.2 <0.2.0-0', '>=0.1.2-0 <0.2.0-0'],
  ['^0.1', '>=0.1.0 <0.2.0-0', '>=0.1.0-0 <0.2.0-0'],
  ['^0.0.1', '0.0.1', '>=0.0.1-0 <0.0.2-0'],
  ['^1.2', '>=1.2.0 <2.0.0-0', '>=1.2.0-0 <2.0.0-0'],
  [
    '^1.2 ^1',
    '>=1.2.0 <2.0.0-0 >=1.0.0 <2.0.0-0',
    '>=1.2.0-0 <2.0.0-0 >=1.0.0-0 <2.0.0-0',
  ],
  [
    '^1.2.3-alpha',
    '>=1.2.3-alpha <2.0.0-0',
    '>=1.2.3-alpha <2.0.0-0',
  ],
  [
    '^1.2.0-alpha',
    '>=1.2.0-alpha <2.0.0-0',
    '>=1.2.0-alpha <2.0.0-0',
  ],
  [
    '^0.0.1-alpha',
    '>=0.0.1-alpha <0.0.2-0',
    '>=0.0.1-alpha <0.0.2-0',
  ],
  [
    '^0.0.1-alpha',
    '>=0.0.1-alpha <0.0.2-0',
    '>=0.0.1-alpha <0.0.2-0',
  ],
  [
    '^0.1.1-alpha',
    '>=0.1.1-alpha <0.2.0-0',
    '>=0.1.1-alpha <0.2.0-0',
  ],
  ['^x', '*', '*'],
  ['x - 1.0.0', '<=1.0.0', '<=1.0.0'],
  ['x - 1.x', '<2.0.0-0', '<2.0.0-0'],
  ['1.0.0 - x', '>=1.0.0', '>=1.0.0-0'],
  ['1.x - x', '>=1.0.0', '>=1.0.0-0'],
  ['<=7.x', '<8.0.0-0', '<8.0.0-0'],
  ['1.0.0 - 2.0.0', '>=1.0.0 <=2.0.0', '>=1.0.0-0 <=2.0.0'],
  [
    '1.2.3+asdf - 2.4.3+asdf',
    '>=1.2.3+asdf <=2.4.3+asdf',
    '>=1.2.3-0+asdf <=2.4.3+asdf',
  ],
  [
    '1.2.3+asdf - 2.4.3+asdf',
    '>=1.2.3+asdf <=2.4.3+asdf',
    '>=1.2.3-0+asdf <=2.4.3+asdf',
  ],
  [
    '^1.2.3+build',
    '>=1.2.3+build <2.0.0-0',
    '>=1.2.3-0+build <2.0.0-0',
  ],
  [
    '^1.2.3+build',
    '>=1.2.3+build <2.0.0-0',
    '>=1.2.3-0+build <2.0.0-0',
  ],
  ['^1.2.3', '>=1.2.3 <2.0.0-0', '>=1.2.3-0 <2.0.0-0'],
  ['^1.2', '>=1.2.0 <2.0.0-0', '>=1.2.0-0 <2.0.0-0'],
  ['>1.2', '>=1.3.0', '>=1.3.0-0'],
  ['<=1.2.3', '<=1.2.3', '<=1.2.3'],
  ['^1.2.3', '>=1.2.3 <2.0.0-0', '>=1.2.3-0 <2.0.0-0'],
  ['=0.7.x', '>=0.7.0 <0.8.0-0', '>=0.7.0-0 <0.8.0-0'],
  ['>=0.7.x', '>=0.7.0', '>=0.7.0-0'],
  ['<=0.7.x', '<0.8.0-0', '<0.8.0-0'],
  ['1.0.0', '1.0.0', '1.0.0'],
  ['>=1.0.0', '>=1.0.0', '>=1.0.0-0'],
  ['>=1.0.0', '>=1.0.0', '>=1.0.0-0'],
  ['>=1.0.0', '>=1.0.0', '>=1.0.0-0'],
  ['>1.0.0', '>1.0.0', '>1.0.0'],
  ['>1.0.0', '>1.0.0', '>1.0.0'],
  ['<=2.0.0', '<=2.0.0', '<=2.0.0'],
  ['<=2.0.0', '<=2.0.0', '<=2.0.0'],
  ['<=2.0.0', '<=2.0.0', '<=2.0.0'],
  ['<2.0.0', '<2.0.0', '<2.0.0-0'],
  ['<2.0.0', '<2.0.0', '<2.0.0-0'],
  ['>=0.1.97', '>=0.1.97', '>=0.1.97-0'],
  ['0.1.20 || 1.2.4', '0.1.20 || 1.2.4', '0.1.20 || 1.2.4'],
  ['>=0.2.3 || <0.0.1', '>=0.2.3 || <0.0.1', '>=0.2.3-0 || <0.0.1-0'],
  ['>=0.2.3 || <0.0.1', '>=0.2.3 || <0.0.1', '>=0.2.3-0 || <0.0.1-0'],
  ['2.x.x', '>=2.0.0 <3.0.0-0', '>=2.0.0-0 <3.0.0-0'],
  ['2.x.x', '>=2.0.0 <3.0.0-0', '>=2.0.0-0 <3.0.0-0'],
  ['1.2.x', '>=1.2.0 <1.3.0-0', '>=1.2.0-0 <1.3.0-0'],
  [
    '1.2.x || 2.x',
    '>=1.2.0 <1.3.0-0 || >=2.0.0 <3.0.0-0',
    '>=1.2.0-0 <1.3.0-0 || >=2.0.0-0 <3.0.0-0',
  ],
  [
    '1.2.x || 2.x',
    '>=1.2.0 <1.3.0-0 || >=2.0.0 <3.0.0-0',
    '>=1.2.0-0 <1.3.0-0 || >=2.0.0-0 <3.0.0-0',
  ],
  ['2.*.*', '>=2.0.0 <3.0.0-0', '>=2.0.0-0 <3.0.0-0'],
  ['2.*.*', '>=2.0.0 <3.0.0-0', '>=2.0.0-0 <3.0.0-0'],
  ['1.2.*', '>=1.2.0 <1.3.0-0', '>=1.2.0-0 <1.3.0-0'],
  [
    '1.2.* || 2.*',
    '>=1.2.0 <1.3.0-0 || >=2.0.0 <3.0.0-0',
    '>=1.2.0-0 <1.3.0-0 || >=2.0.0-0 <3.0.0-0',
  ],
  [
    '1.2.* || 2.*',
    '>=1.2.0 <1.3.0-0 || >=2.0.0 <3.0.0-0',
    '>=1.2.0-0 <1.3.0-0 || >=2.0.0-0 <3.0.0-0',
  ],
  ['2', '>=2.0.0 <3.0.0-0', '>=2.0.0-0 <3.0.0-0'],
  ['2.3', '>=2.3.0 <2.4.0-0', '>=2.3.0-0 <2.4.0-0'],
  ['~0.0.1', '>=0.0.1 <0.1.0-0', '>=0.0.1-0 <0.1.0-0'],
  ['~0.0.1', '>=0.0.1 <0.1.0-0', '>=0.0.1-0 <0.1.0-0'],
  ['~2.4', '>=2.4.0 <2.5.0-0', '>=2.4.0-0 <2.5.0-0'],
  ['~2.4', '>=2.4.0 <2.5.0-0', '>=2.4.0-0 <2.5.0-0'],
  ['~>3.2.1', '>=3.2.1 <3.3.0-0', '>=3.2.1-0 <3.3.0-0'],
  ['~>3.2.1', '>=3.2.1 <3.3.0-0', '>=3.2.1-0 <3.3.0-0'],
  ['~1', '>=1.0.0 <2.0.0-0', '>=1.0.0-0 <2.0.0-0'],
  ['~>1', '>=1.0.0 <2.0.0-0', '>=1.0.0-0 <2.0.0-0'],
  ['~1.0', '>=1.0.0 <1.1.0-0', '>=1.0.0-0 <1.1.0-0'],
  ['<1', '<1.0.0', '<1.0.0-0'],
  ['>=1.2', '>=1.2.0', '>=1.2.0-0'],
  ['=0.7.x', '>=0.7.0 <0.8.0-0', '>=0.7.0-0 <0.8.0-0'],
  ['>=0.7.x', '>=0.7.0', '>=0.7.0-0'],
  ['<0.7.x', '<0.7.0', '<0.7.0-0'],
  ['<1.2.3', '<1.2.3', '<1.2.3-0'],
  ['=1.2.3', '1.2.3', '1.2.3'],
  ['>1.2', '>=1.3.0', '>=1.3.0-0'],
  ['^0.0.1', '0.0.1', '>=0.0.1-0 <0.0.2-0'],
  ['^0.0.1', '0.0.1', '>=0.0.1-0 <0.0.2-0'],
  ['^1.2.3', '>=1.2.3 <2.0.0-0', '>=1.2.3-0 <2.0.0-0'],
  ['^1.2.3', '>=1.2.3 <2.0.0-0', '>=1.2.3-0 <2.0.0-0'],
  ['^1.2', '>=1.2.0 <2.0.0-0', '>=1.2.0-0 <2.0.0-0'],
  ['2.x', '>=2.0.0 <3.0.0-0', '>=2.0.0-0 <3.0.0-0'],
  ['^1.0.0', '>=1.0.0 <2.0.0-0', '>=1.0.0-0 <2.0.0-0'],
  ['^1.0.0', '>=1.0.0 <2.0.0-0', '>=1.0.0-0 <2.0.0-0'],
  ['^1.2.3-rc2', '>=1.2.3-rc2 <2.0.0-0', '>=1.2.3-rc2 <2.0.0-0'],
  ['^1.0.0', '>=1.0.0 <2.0.0-0', '>=1.0.0-0 <2.0.0-0'],
  ['1 - 2', '>=1.0.0 <3.0.0-0', '>=1.0.0-0 <3.0.0-0'],
  ['1 - 2', '>=1.0.0 <3.0.0-0', '>=1.0.0-0 <3.0.0-0'],
  ['1 - 2', '>=1.0.0 <3.0.0-0', '>=1.0.0-0 <3.0.0-0'],
  ['1.0 - 2', '>=1.0.0 <3.0.0-0', '>=1.0.0-0 <3.0.0-0'],
  ['1.1.x', '>=1.1.0 <1.2.0-0', '>=1.1.0-0 <1.2.0-0'],
  ['1.1.x', '>=1.1.0 <1.2.0-0', '>=1.1.0-0 <1.2.0-0'],
  ['1.1.x', '>=1.1.0 <1.2.0-0', '>=1.1.0-0 <1.2.0-0'],
  ['1.1.x', '>=1.1.0 <1.2.0-0', '>=1.1.0-0 <1.2.0-0'],
  ['1.1.x', '>=1.1.0 <1.2.0-0', '>=1.1.0-0 <1.2.0-0'],
  ['1.x', '>=1.0.0 <2.0.0-0', '>=1.0.0-0 <2.0.0-0'],
  ['1.x', '>=1.0.0 <2.0.0-0', '>=1.0.0-0 <2.0.0-0'],
  ['1.x', '>=1.0.0 <2.0.0-0', '>=1.0.0-0 <2.0.0-0'],
  ['1.x', '>=1.0.0 <2.0.0-0', '>=1.0.0-0 <2.0.0-0'],
  ['1.x', '>=1.0.0 <2.0.0-0', '>=1.0.0-0 <2.0.0-0'],
  ['>=1.0.0 <1.1.0', '>=1.0.0 <1.1.0', '>=1.0.0-0 <1.1.0-0'],
  ['>=1.0.0 <1.1.0', '>=1.0.0 <1.1.0', '>=1.0.0-0 <1.1.0-0'],
  ['>=1.0.0 <1.1.0', '>=1.0.0 <1.1.0', '>=1.0.0-0 <1.1.0-0'],
  [
    '>=1.0.0 <1.1.0-pre',
    '>=1.0.0 <1.1.0-pre',
    '>=1.0.0-0 <1.1.0-pre',
  ],
  ['2.x', '>=2.0.0 <3.0.0-0', '>=2.0.0-0 <3.0.0-0'],
  ['2.x', '>=2.0.0 <3.0.0-0', '>=2.0.0-0 <3.0.0-0'],
  ['1.1.x', '>=1.1.0 <1.2.0-0', '>=1.1.0-0 <1.2.0-0'],
  ['1.1.x', '>=1.1.0 <1.2.0-0', '>=1.1.0-0 <1.2.0-0'],
  ['*', '*', '*'],
  ['^1.0.0-0', '>=1.0.0-0 <2.0.0-0', '>=1.0.0-0 <2.0.0-0'],
  ['^1.0.0-rc2', '>=1.0.0-rc2 <2.0.0-0', '>=1.0.0-rc2 <2.0.0-0'],
  ['^1.0.0', '>=1.0.0 <2.0.0-0', '>=1.0.0-0 <2.0.0-0'],
  ['^1.0.0', '>=1.0.0 <2.0.0-0', '>=1.0.0-0 <2.0.0-0'],
  ['1 - 2', '>=1.0.0 <3.0.0-0', '>=1.0.0-0 <3.0.0-0'],
  ['1 - 2', '>=1.0.0 <3.0.0-0', '>=1.0.0-0 <3.0.0-0'],
  ['1.0 - 2', '>=1.0.0 <3.0.0-0', '>=1.0.0-0 <3.0.0-0'],
  ['=0.7.x', '>=0.7.0 <0.8.0-0', '>=0.7.0-0 <0.8.0-0'],
  ['>=0.7.x', '>=0.7.0', '>=0.7.0-0'],
  ['<=0.7.x', '<0.8.0-0', '<0.8.0-0'],
  ['>=1.0.0 <=1.1.0', '>=1.0.0 <=1.1.0', '>=1.0.0-0 <=1.1.0'],
] as [string, string, string][]
