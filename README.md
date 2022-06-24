# Lukes Cpp Helper

Adds functionality to be help write c++ code. <br/>This extension was developed for personal use and does not fully work in some scenarios, it is still in development.<br/>
Any feedback or suggestions is welcomed

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

1. Moving specific functions from header files to cpp files
2. Moving all function from header file to cpp file
3. Moving functions, generates new header file if it does not exist
4. Creates common default implemented constructors
5. Generate constructor with all attributes as parameters

---


### Move All Function Implementations
Creates a new file if it does not already exist
![](docs/imgs/Move%20All%20Impl%20And%20Create.gif)


---

### Move Individual Function Implementation merges with existing namespaces
![](docs/imgs/Move%201%20impl%20inside%20namespace.gif) 

---

![](docs/imgs/Move%201%20impl%20outside.gif)


---

### Create Basic Constructor
Works best when all symbols can be found, else uses best guess when not, for example std::string is unknown in this example
![](docs/imgs/Create%20Constructor.gif)



---

### Create Default Constructors
Creates the basic default constructors and assignment operator
![](docs/imgs/Create%20Default%20Constructors.gif)



## Known Issues

1. Moving constructors does not correctly remove initializer list
2. Creating constructor of unknown types that are comma seperate, for example std::string me, you; if std::string is not resolved.

## Release Notes
### 1.1.0

Initial release of cpp helper
1. added basic functionality of moving functions

### 1.1.1
Major bug fixes and additional documentation

## Upcoming Features
1. Moving blocks of code to newly generated header file