export const DEFAULT_PYTHON_CODE =
	"#You have access to both libraries with all modules\n#Import as it is below and feel free to use =)\nimport scipy\nimport pandas\n\n\ndef main():\n    mydataset = {\n        " +
	'\'languages\': ["JS", "GO", "Python"],\n        \'speed\': [7, 8, 5]\n    }\n    print("Hello, world!")\n    print(pandas.DataFrame(mydataset))\n    print(scipy.constants.liter)\n\nmain()';
