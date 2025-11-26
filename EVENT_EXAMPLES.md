{
  "eventId": "f8326e86-6775-4490-b2bc-cedf68ad6098",
  "eventType": "user.login",
  "timestamp": "2025-11-24T20:29:06.114Z",
  "source": {
    "application": "mediagrade",
    "version": "1.0.0",
    "environment": "staging"
  },
  "actor": {
    "userId": "29197245-df9e-419b-8864-043e2646baf3",
    "accountId": "432fd117-15fd-4e23-907d-6dd4e62caf43",
    "role": null
  },
  "scope": {
    "accountId": "432fd117-15fd-4e23-907d-6dd4e62caf43",
    "resourceType": "user",
    "resourceId": "29197245-df9e-419b-8864-043e2646baf3"
  },
  "payload": {
    "email": "pierre.humblotferrero@gmail.com",
    "roles": [
      "superadmin"
    ],
    "loginMethod": "email"
  },
  "metadata": {
    "ipAddress": "90.91.175.63",
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
  }
}

{
  "eventId": "28c98cc2-76fb-479b-8aba-cca254e9779d",
  "eventType": "user.logout",
  "timestamp": "2025-11-24T08:46:21.442Z",
  "source": {
    "application": "mediagrade",
    "version": "1.0.0",
    "environment": "development"
  },
  "actor": {
    "userId": "29197245-df9e-419b-8864-043e2646baf3",
    "accountId": "03bdbf53-fedd-4773-9f8d-1ef6374dac3c",
    "role": null
  },
  "scope": {
    "accountId": "03bdbf53-fedd-4773-9f8d-1ef6374dac3c",
    "resourceType": "user",
    "resourceId": "29197245-df9e-419b-8864-043e2646baf3"
  },
  "payload": {
    "email": "pierre.humblotferrero@gmail.com",
    "userId": "29197245-df9e-419b-8864-043e2646baf3",
    "logoutMethod": "user_action"
  },
  "metadata": {
    "ipAddress": "90.91.175.63",
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
  }
}

{
  "eventId": "15903a2a-8388-4eb7-b536-7d518a7ca49e",
  "eventType": "file.create",
  "timestamp": "2025-11-24T20:44:43.196Z",
  "source": {
    "application": "sftp-https",
    "version": "1.0.0",
    "environment": "staging"
  },
  "actor": {
    "userId": "00000000-0000-0000-0000-000000000000",
    "accountId": "432fd117-15fd-4e23-907d-6dd4e62caf43",
    "role": null
  },
  "scope": {
    "accountId": "432fd117-15fd-4e23-907d-6dd4e62caf43",
    "resourceType": "file",
    "resourceId": "549c1648-7219-40bd-a2f5-a049dc924b1b"
  },
  "payload": {
    "file_name": "0486_001.jpg",
    "file_path": "mediagrade-four1-432fd117/files/0486_001.jpg",
    "file_size": 1304041,
    "mime_type": "image/jpeg",
    "is_directory": false
  },
  "metadata": {
    "client_ip": "172.16.4.154",
    "file_hash": "734eebf3c0e6e9b1f2bfbfcfb038dfc92b67c0b009a7230269526fda21eb006d",
    "upload_bandwidth_mbps": 16.31
  }
}

{
  "eventId": "9b67e622-8116-451d-ac1d-d9232d2ff1da",
  "eventType": "file.create",
  "timestamp": "2025-11-24T20:35:04.039Z",
  "source": {
    "application": "sftp",
    "version": "1.0.0",
    "environment": "staging"
  },
  "actor": {
    "userId": "00000000-0000-0000-0000-000000000000",
    "accountId": "432fd117-15fd-4e23-907d-6dd4e62caf43",
    "role": null
  },
  "scope": {
    "accountId": "432fd117-15fd-4e23-907d-6dd4e62caf43",
    "resourceType": "file",
    "resourceId": "3c6303f1-9dbc-454f-9547-0b981bfd2bc7"
  },
  "payload": {
    "file_name": "0484_001.jpg",
    "file_path": "mediagrade-four1-432fd117/files/0484_001.jpg",
    "file_size": 1333150,
    "mime_type": "image/jpeg",
    "is_directory": false
  },
  "metadata": null
}

{
  "eventId": "f3bcf4dc-7dac-4719-b449-efc07665e5b3",
  "eventType": "file.delete",
  "timestamp": "2025-11-24T21:00:19.072Z",
  "source": {
    "application": "sftp",
    "version": "1.0.0",
    "environment": "staging"
  },
  "actor": {
    "userId": "00000000-0000-0000-0000-000000000000",
    "accountId": "432fd117-15fd-4e23-907d-6dd4e62caf43",
    "role": null
  },
  "scope": {
    "accountId": "432fd117-15fd-4e23-907d-6dd4e62caf43",
    "resourceType": "file",
    "resourceId": "54e4f93b-77e6-4a10-b6f9-d1249149b81a"
  },
  "payload": {
    "file_name": "0478_001.jpg",
    "file_path": "mediagrade-four1-432fd117/files/0478_001.jpg",
    "file_size": 1202293,
    "mime_type": "image/jpeg",
    "is_directory": false
  },
  "metadata": null
}

{
  "eventId": "14f02f74-1c58-4ea9-ad96-b87412329bf2",
  "eventType": "file.delete",
  "timestamp": "2025-11-24T20:59:16.817Z",
  "source": {
    "application": "sftp-https",
    "version": "1.0.0",
    "environment": "staging"
  },
  "actor": {
    "userId": "00000000-0000-0000-0000-000000000000",
    "accountId": "432fd117-15fd-4e23-907d-6dd4e62caf43",
    "role": null
  },
  "scope": {
    "accountId": "432fd117-15fd-4e23-907d-6dd4e62caf43",
    "resourceType": "file",
    "resourceId": "ea736f5e-83dc-4e89-b63d-3768d562f15b"
  },
  "payload": {
    "file_name": "0477_001.jpg",
    "file_path": "mediagrade-four1-432fd117/files/0477_001.jpg",
    "file_size": 1307262,
    "mime_type": "image/jpeg",
    "is_directory": false
  },
  "metadata": {
    "client_ip": "172.16.4.154",
    "file_hash": "edcea3e62b3b127702d41dbda6894845fba9e47612c19409f497b0d4694fe8a1",
    "deleted_at": "2025-11-24T20:59:16.638Z",
    "deletion_reason": "manual"
  }
}

{
  "eventId": "918928a4-49bc-4cad-aa4c-82293ed2c32b",
  "eventType": "file.update",
  "timestamp": "2025-11-24T21:23:27.479Z",
  "source": {
    "application": "sftp-https",
    "version": "1.0.0",
    "environment": "staging"
  },
  "actor": {
    "userId": "00000000-0000-0000-0000-000000000000",
    "accountId": "432fd117-15fd-4e23-907d-6dd4e62caf43",
    "role": null
  },
  "scope": {
    "accountId": "432fd117-15fd-4e23-907d-6dd4e62caf43",
    "resourceType": "file",
    "resourceId": "6fba7d29-6a9e-4035-9f6a-5318af8497e3"
  },
  "payload": {
    "file_name": "0479_001_nada.jpg",
    "file_path": "mediagrade-four1-432fd117/files/0479_001_nada.jpg",
    "file_size": 1304456,
    "mime_type": "image/jpeg",
    "is_directory": false
  },
  "metadata": {
    "client_ip": "172.16.4.154",
    "file_hash": "e1a548c63d9480fd4d54be90d389c4ad54d73a13d81d472dec617d8018300ab2",
    "modification_type": "rename",
    "previous_file_name": "0479_001_nope.jpg"
  }
}

{
  "eventId": "7556962f-ef3b-4c10-af45-9dcc28b497df",
  "eventType": "file.share",
  "timestamp": "2025-11-24T22:38:06.867Z",
  "source": {
    "application": "mediagrade",
    "version": "1.0.0",
    "environment": "development"
  },
  "actor": {
    "userId": "29197245-df9e-419b-8864-043e2646baf3",
    "accountId": "432fd117-15fd-4e23-907d-6dd4e62caf43",
    "role": null
  },
  "scope": {
    "accountId": "432fd117-15fd-4e23-907d-6dd4e62caf43",
    "resourceType": "share_config",
    "resourceId": "432fd117-15fd-4e23-907d-6dd4e62caf43"
  },
  "payload": {
    "action": "global_disable",
    "share_type": "global",
    "affected_retailer_account_ids": [
      "03bdbf53-fedd-4773-9f8d-1ef6374dac3c",
      "f4fc1a7b-3a16-4081-b747-70f65eaba4c9"
    ]
  },
  "metadata": {
    "warning": "Files no longer accessible unless explicitly shared",
    "previous_state": true,
    "retailer_count": 2
  }
}

