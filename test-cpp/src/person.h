#pragma once



namespace Anatomy {

struct IRattle{
    virtual void shake() = 0;

};

struct IHuman :  private IBaby<IRattle,IRattle> {
    virtual void breath() = 0;
};

template<typename T, typename G>
struct IBaby{
    T t;
    G g;
    virtual void cry() = 0;
};

struct IPerson : public IHuman {


};

class Person : IPerson {

virtual void breath(){}

virtual void cry(){}

};






/*

    std::string name, george; 
    int age, height, *numberOfSiblings;
    std::vector<int> f;  
    Dog* dog;        // this can be forward declared
    Socket socket;        

    struct Identity {
        int id;
    } identity;


    

    int getAge();

    virtual void foo() = 0;
    virtual void goo(){};

    void setAge(int age);

    Identity getIdentity() { return identity; }

    void getIdentity(Identity identity) { this->identity = identity; }

    std::string getName();
*/

}  // namespace Anatomy


void foo();
