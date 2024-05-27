import {
  Chain,
  BroadcasterConnectionStatus,
  SelectedBroadcaster,
} from '@railgun-community/shared-models';
import {
  BroadcasterConnectionStatusCallback,
  BroadcasterDebugger,
  BroadcasterOptions,
  BroadcasterTransaction,
  WakuBroadcasterClient,
} from '@railgun-community/waku-broadcaster-client-node';
import { sendWakuError, sendWakuMessage } from '../bridge/loggers';
import {
  BridgeCallEvent,
  BridgeEvent,
  BroadcasterActionData,
  BroadcasterFindAllBroadcastersForChainParams,
  BroadcasterFindAllBroadcastersForTokenParams,
  BroadcasterFindBestBroadcasterParams,
  BroadcasterFindRandomBroadcasterForTokenParams,
  BroadcasterBroadcastTransactionParams,
  BroadcasterSendActionData,
  BroadcasterSetAddressFiltersParams,
  BroadcasterSetChainParams,
  BroadcasterStartParams,
  BroadcasterStatusCallbackData,
  BroadcasterSupportsERC20TokenParams,
} from '../bridge/model';
import {
  bridgeRegisterCall,
  triggerBridgeEvent,
} from '../bridge/node-ipc-service';

const onBroadcasterStatusCallback = (data: BroadcasterStatusCallbackData) => {
  triggerBridgeEvent(BridgeEvent.OnBroadcasterStatusCallback, data);
};

const statusCallback: BroadcasterConnectionStatusCallback = (
  chain: Chain,
  status: BroadcasterConnectionStatus,
) => {
  onBroadcasterStatusCallback({ chain, status });
};

const broadcasterDebugger: BroadcasterDebugger = {
  log: (msg: string) => {
    sendWakuMessage(msg);
  },
  error: (err: Error) => {
    sendWakuMessage('Error:');
    sendWakuError(err);
  },
};

bridgeRegisterCall<BroadcasterStartParams, BroadcasterActionData>(
  BridgeCallEvent.BroadcasterStart,
  async ({
    chain,
    pubSubTopic,
    additionalDirectPeers,
    peerDiscoveryTimeout,
    poiActiveListKeys,
  }) => {
    try {
      const broadcasterOptions: BroadcasterOptions = {
        pubSubTopic,
        additionalDirectPeers,
        peerDiscoveryTimeout,
        poiActiveListKeys,
      };
      await WakuBroadcasterClient.start(
        chain,
        broadcasterOptions,
        statusCallback,
        broadcasterDebugger,
      );
      return {};
    } catch (err) {
      return { error: err.message };
    }
  },
);

bridgeRegisterCall<
  Record<string, never>, BroadcasterActionData
>(BridgeCallEvent.BroadcasterTryReconnect, async () => {
  try {
    await WakuBroadcasterClient.tryReconnect();
    return {};
  } catch (err) {
    return { error: err.message };
  }
});

bridgeRegisterCall<BroadcasterSetAddressFiltersParams, void>(
  BridgeCallEvent.BroadcasterSetAddressFilters,
  async ({ allowlist, blocklist }) => {
    return WakuBroadcasterClient.setAddressFilters(allowlist, blocklist);
  },
);

bridgeRegisterCall<BroadcasterSetChainParams, void>(
  BridgeCallEvent.BroadcasterSetChain,
  async ({ chain }) => {
    return WakuBroadcasterClient.setChain(chain);
  },
);

bridgeRegisterCall<
  BroadcasterFindBestBroadcasterParams,
  Optional<SelectedBroadcaster>
>(
  BridgeCallEvent.BroadcasterFindBestBroadcaster,
  async ({ chain, tokenAddress, useRelayAdapt }) => {
    return WakuBroadcasterClient.findBestBroadcaster(
      chain,
      tokenAddress,
      useRelayAdapt,
    );
  },
);

bridgeRegisterCall<
  BroadcasterFindRandomBroadcasterForTokenParams,
  Optional<SelectedBroadcaster>
>(
  BridgeCallEvent.BroadcasterFindRandomBroadcasterForToken,
  async ({ chain, tokenAddress, useRelayAdapt, percentage }) => {
    return WakuBroadcasterClient.findRandomBroadcasterForToken(
      chain,
      tokenAddress,
      useRelayAdapt,
      percentage,
    );
  },
);

bridgeRegisterCall<
  BroadcasterFindAllBroadcastersForTokenParams,
  Optional<SelectedBroadcaster[]>
>(
  BridgeCallEvent.BroadcasterFindAllBroadcastersForToken,
  async ({ chain, tokenAddress, useRelayAdapt }) => {
    return WakuBroadcasterClient.findBroadcastersForToken(
      chain,
      tokenAddress,
      useRelayAdapt,
    );
  },
);

bridgeRegisterCall<
  BroadcasterFindAllBroadcastersForChainParams,
  Optional<SelectedBroadcaster[]>
>(
  BridgeCallEvent.BroadcasterFindAllBroadcastersForChain,
  async ({ chain, useRelayAdapt }) => {
    return WakuBroadcasterClient.findAllBroadcastersForChain(
      chain,
      useRelayAdapt,
    );
  },
);

bridgeRegisterCall<
  Record<string, never>, number
>(BridgeCallEvent.BroadcasterGetMeshPeerCount, async () => {
  return WakuBroadcasterClient.getMeshPeerCount();
});

bridgeRegisterCall<
  Record<string, never>, number
>(BridgeCallEvent.BroadcasterGetPubSubPeerCount, async () => {
  return WakuBroadcasterClient.getPubSubPeerCount();
});

bridgeRegisterCall<
  Record<string, never>, number
>(BridgeCallEvent.BroadcasterGetLightPushPeerCount, async () => {
  const peerCount = await WakuBroadcasterClient.getLightPushPeerCount();
  return peerCount;
});

bridgeRegisterCall<
  Record<string, never>, number
>(BridgeCallEvent.BroadcasterGetFilterPeerCount, async () => {
  const peerCount = await WakuBroadcasterClient.getFilterPeerCount();
  return peerCount;
});

bridgeRegisterCall<
  BroadcasterBroadcastTransactionParams,
  BroadcasterSendActionData
>(
  BridgeCallEvent.BroadcasterBroadcastTransaction,
  async ({
    txidVersionForInputs,
    to,
    data,
    broadcasterRailgunAddress,
    broadcasterFeesID,
    chain,
    nullifiers,
    overallBatchMinGasPrice,
    useRelayAdapt,
    preTransactionPOIsPerTxidLeafPerList,
  }) => {
    try {
      const broadcasterTransaction = await BroadcasterTransaction.create(
        txidVersionForInputs,
        to,
        data,
        broadcasterRailgunAddress,
        broadcasterFeesID,
        chain,
        nullifiers,
        overallBatchMinGasPrice,
        useRelayAdapt,
        preTransactionPOIsPerTxidLeafPerList,
      );
      const txHash = await broadcasterTransaction.send();
      return { txHash };
    } catch (err) {
      return { error: err.message };
    }
  },
);

bridgeRegisterCall<BroadcasterSupportsERC20TokenParams, boolean>(
  BridgeCallEvent.BroadcasterSupportsERC20Token,
  async ({ chain, tokenAddress, useRelayAdapt }) => {
    return WakuBroadcasterClient.supportsToken(
      chain,
      tokenAddress,
      useRelayAdapt,
    );
  },
);
