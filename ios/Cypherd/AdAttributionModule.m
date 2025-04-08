//
//  AdAttributionModule.m
//  Cypherd
//
//  Created by Mohanram J S on 08/04/25.
//

#import "AdAttributionModule.h"
#import <AdServices/AdServices.h>
#import <React/RCTLog.h>

@implementation AdAttributionModule

RCT_EXPORT_MODULE();

RCT_REMAP_METHOD(getAttributionReferralCode,
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  RCTLogInfo(@"Inside getAttributionReferralCode method");
  NSError *error = nil;
  NSString *token = [AAAttribution attributionTokenWithError:&error];

  if (error || token == nil) {
    resolve(nil);
    return;
  }

  NSURL *url = [NSURL URLWithString:@"https://api-adservices.apple.com/api/v1/"];
  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
  request.HTTPMethod = @"POST";
  [request setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];

  NSDictionary *body = @{ @"attributionToken": token };
  NSData *jsonData = [NSJSONSerialization dataWithJSONObject:body options:0 error:nil];
  request.HTTPBody = jsonData;

  NSURLSessionDataTask *task = [[NSURLSession sharedSession]
    dataTaskWithRequest:request
      completionHandler:^(NSData * _Nullable data,
                          NSURLResponse * _Nullable response,
                          NSError * _Nullable error) {

    if (error || !data) {
      resolve(nil);
      return;
    }

    NSDictionary *responseDict = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
    NSString *campaignId = responseDict[@"campaignId"];
    if ([campaignId isKindOfClass:[NSString class]]) {
      resolve(campaignId);
    } else {
      resolve(nil);
    }
  }];

  [task resume];
}

@end
