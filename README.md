# cypherd-ui

TBD: Next step is to prototype the interaction between React Native app back to webview (response to JSON RPC calls). interaction from Webview to reactNative has already been implemented.

## <B> Steps to run the project locally </B>

### Configure

1. Sentry in sentry.properties file
2. GoogleService in plist file

[React Native MAC Setup Guide](https://reactnative.dev/docs/environment-setup)

```
npm install (from the root folder)
npx pod-install (from the root folder)
```

To run:

```
npm install <package-name>
npx pod-install (from the root folder)

npx react-native start --reset-cache
npx react-native run-ios
```

To clear the cache:
If you are sure the module exists, try these steps:

1.  Clear watchman watches: `watchman watch-del-all`
2.  Delete node_modules and `run yarn install`
3.  Reset Metro's cache: `yarn start --reset-cache`
4.  Remove the cache: `rm -rf /tmp/metro-*`

To close the app:

Shift+Command+H twice to open all apps, swipe up to close the app

<B>Introduction</B>
</BR>

</B>EIP-1193</B>
</BR>
EIP-1193 Ethereum Provider Javascript API
https://eips.ethereum.org/EIPS/eip-1193
Ethereum Provider API defines the standard on how a dApp interacts with the wallet app through RPC calls using injected content-scripts by setting the window.ethereum object in javascript.

<B>Communication between WebView and ReactNative</B>
</BR>
react-native-webview component has capability for the webview to interact with the react-native app in both directions
https://github.com/react-native-webview/react-native-webview/blob/master/docs/Guide.md#communicating-between-js-and-native

<B>Installation Instructions for react-native web3.js</B></BR>
web3.js reactive native installation instructions from https://levelup.gitconnected.com/tutorial-how-to-set-up-web3js-1-x-with-react-native-0-6x-2021-467b2e0c94a4

Highlight from the above article
Final Step
Each time you add a new npm package, you will need to hack the node modules again, to automate this, simply add this to your package.json:
"scripts": {
...
"postinstall": "./node_modules/.bin/rn-nodeify --install 'crypto,buffer,react-native-randombytes,vm,stream,http,https,os,url,net,fs' --hack"
},

<B> Setup Instructions: </B>
https://reactnative.dev/docs/next/environment-setup

<B> Note: </B>
Once in a while, run the below command to clear the cache.

- Please make sure to run "watchman watch-del-all" and "npm start --reset-cache" before running the app.

M1 Specific instruction

```
sudo arch -x86_64 gem install ffi
arch -x86_64 pod install -- for pod install
```

![Alt](https://repobeats.axiom.co/api/embed/6b56a18d1d04f0be2d12cef997469095a3e92039.svg 'Repobeats analytics image')
