export const getInjectedJavascript = (address: string, chainIdNumber: string) => `
    window.addEventListener('load', () => {

      let info = {
        webinfo: {
          title: document.title,
          url: location.href,
          origin: location.origin,
          host: location.host
        }
      }

      Array.from(document.querySelectorAll('a[target="_blank"]'))
        .forEach(link => link.removeAttribute('target'));

      window.ReactNativeWebView.postMessage(JSON.stringify(info));
    })
    const callbacks = new Map();
    const CustomProvider = {};
    const ethEvents = new Map();
    CustomProvider.isConnected = function(){
        return true;
    };
    CustomProvider.enable = function() {
        return new Promise(
            function(resolve, reject){
                resolve(["${address}"]);
            }
        );
    };
    CustomProvider.on = function(eventName, callback){
        if(eventName == 'connect')
        {
        }
    };
    function genId() {
        return new Date().getTime() + Math.floor(Math.random() * 1000);
    }
    CustomProvider.request = function(payload){
      var finalPayload;
      if(payload.method !== undefined){
        finalPayload = payload;
      }else{
        finalPayload = {method: payload};
      }
      finalPayload.id = genId();
      return new Promise(function (resolve, reject) {
        //route call to reactNative->web3JS->Infura
        callbacks.set(finalPayload.id, (error, data) => {
          if(error){
            reject(error);
          }else{
            resolve(data);
          }
        });
        window.ReactNativeWebView.postMessage(JSON.stringify(finalPayload));
      });
    }
    CustomProvider.send = function(payload){
        CustomProvider.request(payload);
    }
    CustomProvider.sendAsync = function(payload){
        CustomProvider.request(payload);
    }
    CustomProvider.sendResponse = function(id, result){
        let callback = callbacks.get(id);
        if(callback){
            callback(null, result);
            callbacks.delete(id);
        }else{
        }
    }
    CustomProvider.on = function(eventName, fn){
      if(eventName === 'chainChanged') {
        ethEvents.set(eventName, fn);
      }
    }
    CustomProvider.loadChainChange = function(id, chainId){
      if(id){
        callbacks.delete(id);
      }
      // CustomProvider.chainId=chainId;
      event_fn = ethEvents.get('chainChanged');
      if(event_fn) {
        event_fn(chainId);
      }
    }
    CustomProvider.removeAllListeners = () => { console.log("Invoked remove all listeners"); };
    CustomProvider.chainId="${chainIdNumber}";
    CustomProvider.isMetaMask = true;
    CustomProvider.isCypherD = true;
    CustomProvider.selectedAddress = "${address}";
    window.ethereum = CustomProvider;
`;
