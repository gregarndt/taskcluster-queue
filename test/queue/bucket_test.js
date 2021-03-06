suite('queue/bucket_test', function() {
  var Promise       = require('promise');
  var slugid        = require('slugid');
  var assert        = require('assert');
  var Bucket        = require('../../queue/bucket');
  var base          = require('taskcluster-base');
  var _             = require('lodash');
  var debug         = require('debug')('queue:test:queue:bucket_test');
  var request       = require('superagent-promise');

  // Load configuration
  var cfg = base.config({
    defaults:     require('../../config/defaults'),
    profile:      require('../../config/' + 'test'),
    envs: [
      'aws_accessKeyId',
      'aws_secretAccessKey',
    ],
    filename:     'taskcluster-queue'
  });

  // Check that we have an account
  if (!cfg.get('aws:accessKeyId')) {
    console.log("\nWARNING:");
    console.log("Skipping 'Bucket' tests, missing config file: " +
                "taskcluster-queue.conf.json");
    return;
  }

  // Create bucket instance
  var bucket = new Bucket({
    bucket:       cfg.get('queue:publicArtifactBucket'),
    credentials:  cfg.get('aws')
  });


  // Test that put to signed url works
  test("createPutUrl", function() {
    var key     = slugid.v4();
    return bucket.createPutUrl(key, {
      contentType:      'application/json',
      expires:          60 * 10
    }).then(function(url) {
      return request
        .put(url)
        .send({message: "Hello"})
        .end();
    });
  });

  // Test we can delete an object
  test("deleteObject", function() {
    var key     = slugid.v4();
    return bucket.createPutUrl(key, {
      contentType:      'application/json',
      expires:          60 * 10
    }).then(function(url) {
      return request
        .put(url)
        .send({message: "Hello"})
        .end();
    }).then(function() {
      return bucket.deleteObject(key);
    });
  });

  // Test we can delete an object a non-existing object
  test("deleteObject (non-existing object)", function() {
    var key     = slugid.v4();
    return bucket.deleteObject(key);
  });

  test("createGetUrl", async function() {
    var key     = slugid.v4();
    var url     = await bucket.createPutUrl(key, {
      contentType:      'application/json',
      expires:          60 * 10
    })

    var res = await request.put(url).send({message: "Hello"}).end();
    assert(res.ok, "put request failed");

    url = bucket.createGetUrl(key);
    debug("createGetUrl -> %s", url);

    var res = await request.get(url).end();
    assert(res.ok, "get request failed");
    assert(res.body.message === 'Hello', "wrong message");
  });
});
