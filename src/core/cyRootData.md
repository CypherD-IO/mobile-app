```
{
    addresses:[addr1, addr2], # list of address to support multiple wallets
    meta:{ // parent key all the account meta info
        addr1: { // address as the key
            privateKey: abc,
            someOtherKey: value,
            subscribed: true // something like push notification
        },
        addr2: { // address as the key
            privateKey: abdd,
            someOtherKey: value,
            subscribed: true // something like push notification
        }

    }
}

```