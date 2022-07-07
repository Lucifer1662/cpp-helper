#pragma once

namespace Anatomy {

class Person {
    std::string name, george;  // external from workspace
    int age, height, *numberOfSiblings;
    std::vector<int> f;  // external from workspace
    Dog dog;             // local
    Socket socket;       // external but in local include folder

    struct Identity {
        int id;
    } identity;

    int getAge();

    void setAge(int age);

    Identity getIdentity() { return identity; }

    void getIdentity(Identity identity) { this->identity = identity; }

    std::string getName();
};

}  // namespace Anatomy

void foo();
