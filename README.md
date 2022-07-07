# Luke's Cpp Helper

Adds functionality to be help write c++ code. <br/>
This extension was developed for personal use and does not fully work in some scenarios, it is still in development. <br/>
Any feedback or suggestions is welcomed

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

1. Moving specific functions from header files to cpp files
2. Moving all function from header file to cpp file
3. Moving functions, generates new header file if it does not exist
4. Move content to a new header file
5. Creates common default implemented constructors
6. Generate constructor with all attributes as parameters
7. Add all includes
8. Add specific includes via context menu, or quick fix


All context menu items can be removed in the settings, by default they are all present. </br>
Include/external folders can added in the config settings, to make includes correct.

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

### Move To Header File
Moves selection to a new header file
1. creates the file, adds #pragma once
2. if selection is embedded in namespaces creates those as well
3. adds include of new file to original 

![](docs/imgs/Move%20to%20header.gif)


---

### Create Basic Constructor
Works best when all symbols can be found, else uses best guess when not, for example std::string is unknown in this example

![](docs/imgs/Create%20Constructor.gif)



---

### Create Default Constructors
Creates the basic default constructors and assignment operator

![](docs/imgs/Create%20Default%20Constructors.gif)


---

### Add All missing Icludes
Adds all the missing includes. Works by looking at every word and seeing if its declaration is missing from the includes.</br>
It contains hardcoded mappings of the standard library so similar named symbols might get resolve to the std lib instead of user defined.

![](docs/imgs/Add%20All%20Includes.gif)


### Add Include for Specific Symbol
Adds specific include that is currently selected.</br>
It contains hardcoded mappings of the standard library so similar named symbols might get resolve to the std lib instead of user defined.</br>
Available as command or in context menu or as a quick fix.

![](docs/imgs/Quick%20Fix%20Include.gif)

![](docs/imgs/Add%20Include%20For.gif)


### Forward Declare of struct/class
Forward declaring is useful on large projects as it can reduce build time significantly. </br>
As if person.h includes dog.h, we can image lots of other files like world.h including person.h implicitly including dog.h even if it does not use dog. </br>
Thus if any change is made to dog.h a lot of build system will then rebuild person.h and world.h, but by forward declaring we can remove these dependencies. </br>
When a type is only mention as a pointer/reference and without any dereferencing, it can be forward declared.</br>
The steps are:
1. Move/delete existing include for type to cpp file if cpp exists.
2. Add in forward declaration. Does not handle spacing currently
   
![](docs/imgs/Forward%20Declare.gif)



## Known Issues

1. Moving constructors does not correctly remove initializer list
2. Creating constructor of unknown types that are comma separate, for example std::string me, you; if std::string is not resolved.

## Release Notes
### 1.1.0

Initial release of cpp helper
1. added basic functionality of moving functions

### 1.1.0
Major bug fixes and additional documentation

### 1.2.0
Added move to header file command

### 1.2.1
Fixed create constructor command not working with structs

### 1.3.0
Fixed create constructor command not working with comments </br>
Added add includes automatically

### 1.4.0
Add specific include for clicked on symbol</br>
Add quick fix suggestion to include symbol

### 1.4.1
Add include quick fix to show multiple options for include


### 1.5.0
Added forward declare, does not handle name spacing</br>
Fixed relative includes using ../ notation

### 1.5.1
Fixed relative includes not removing same root paths