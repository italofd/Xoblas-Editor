export const DEFAULT_PYTHON_CODE =
  // eslint-disable-next-line
  '#You have access to 2 additional libraries below\nimport pandas as pd\nimport scipy\n\ndef main():  \n    print("Hello, world!")\n\n    mydataset = {\n        \'cars\': ["BMW", "Volvo", "Ford"],\n        \'passings\': [3, 7, 2]\n    }\n\n    print(pd.DataFrame(mydataset))    \n    print(scipy.constants.liter)\n\nmain()\n\n';
