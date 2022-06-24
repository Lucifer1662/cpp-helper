#pragma once
#include <vector>
#include <string>
#include "dog.h"

namespace Anatomy{

class Person {
    std::string name, george;
    int age, height, *numberOfSiblings;
    std::vector<int> f;
    Dog dog;

    struct Identity{
        int id;
    } identity;


    

    int getAge();

    void setAge(int age); 

    Identity getIdentity(){
        return identity;
    }  

    void getIdentity(Identity identity){
        this->identity = identity;
    }  

    std::string getName();
    
};

}

void foo();



