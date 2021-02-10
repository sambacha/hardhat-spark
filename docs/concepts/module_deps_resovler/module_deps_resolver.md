# Module dependency resolving

Lets take this simple example of `A`, `B`, `C` contracts and `(B, C).afterDeploy()` event to show case how dependency resolving is functioning.

![ModuleExample](../../images/module_example.png)

As you can see B and C cannot be deployed because they rely on `A` as a constructor param. So we will firstly ensure that A is deployed, because it didn't rely on anything. 
    
1. Deploy contract `A`
   
After successfully deploying contract `A` both `B` and `C` have their dependencies resolved, so we can execute either one. But we still cannot execute our event.

2. Deploy contract `B(A)`
3. Deploy contract `C(A)`

Upon execution of "last" needed dependencies of our event  will be resolved.
   
4. Execute `afterDeploy` event hook after `B` and `C` has been deployed

For more complex example you can look at [this](../../usage/complex.md)
