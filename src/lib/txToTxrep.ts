import {
  Asset,
  FeeBumpTransaction,
  Memo,
  Operation,
  Signer,
  StrKey,
  Transaction,
  xdr
} from '@stellar/stellar-sdk';

import BigNumber from 'bignumber.js';
import { best_r, upperSnakeCase } from './utils';

type LineAdder = (k: string, v: any, optional?: boolean) => void;

export function toTxrep(transaction: Transaction | FeeBumpTransaction) {
  const lines = [];

  if (transaction instanceof Transaction) {
    addLine('tx.sourceAccount', transaction.source, lines);
    addLine('tx.fee', transaction.fee, lines);
    addLine('tx.seqNum', transaction.sequence, lines);
    addTimeBounds(transaction.timeBounds, lines);
    addMemo(transaction.memo, lines);
    addOperations(transaction.operations, lines);
    addLine('tx.ext.v', 0, lines);
  }

  addSignatures(transaction.signatures, lines);

  return lines.join('\n');
}

function addLine(key: string, value: any, lines: string[]) {
  if (value !== undefined) {
    lines.push(`${key}: ${value}`);
  }
}

function addTimeBounds(
  timeBounds: { minTime: string; maxTime: string },
  lines: string[]
) {
  if (timeBounds != null) {
    addLine('tx.timeBounds._present', true, lines);
    addLine('tx.timeBounds.minTime', timeBounds.minTime, lines);
    addLine('tx.timeBounds.maxTime', timeBounds.maxTime, lines);
  } else {
    addLine('tx.timeBounds._present', false, lines);
  }
}

function addMemo(memo: Memo, lines: string[]) {
  switch (memo.type) {
    case 'none':
      addLine('tx.memo.type', 'MEMO_NONE', lines);
      return;
    case 'text':
      addLine('tx.memo.type', 'MEMO_TEXT', lines);
      addLine(
        'tx.memo.text',
        JSON.stringify(memo.value.toString('utf-8')),
        lines
      );
      return;
    case 'id':
      addLine('tx.memo.type', 'MEMO_ID', lines);
      addLine('tx.memo.id', memo.value, lines);
      return;
    case 'hash':
      addLine('tx.memo.type', 'MEMO_HASH', lines);
      addLine('tx.memo.hash', toOpaque(memo.value), lines);
      return;
    case 'return':
      addLine('tx.memo.type', 'MEMO_RETURN', lines);
      addLine('tx.memo.retHash', toOpaque(memo.value), lines);
      return;
  }
}

function addOperations(operations: Operation[], lines: string[]) {
  addLine('tx.operations.len', operations.length, lines);
  operations.forEach((operation, i) => {
    addOperation(operation, i, lines);
  });
}

function addOperation(operation: Operation, i: number, lines: string[]) {
  const prefix = `tx.operations[${i}]`;
  const addOpLine = (k: string, v: any) => addLine(`${prefix}.${k}`, v, lines);
  if (operation.source) {
    addOpLine('sourceAccount._present', true);
    addOpLine('sourceAccount', operation.source);
  } else {
    addOpLine('sourceAccount._present', false);
  }

  const type = upperSnakeCase(operation.type);
  addOpLine('body.type', type);
  const addBodyLine = (k: string, v: any, optional = false) => {
    const key = `body.${operation.type}Op.${k}`;
    if (optional) {
      const present = v !== null && v !== undefined;
      addOpLine(`${key}._present`, present);
      if (present) {
        addOpLine(key, v);
      }
    } else {
      addOpLine(key, v);
    }
  };
  switch (operation.type) {
    case 'createAccount':
      addCreateAccountOperation(operation, addBodyLine);
      return;
    case 'payment':
      addPaymentOperation(operation, addBodyLine);
      return;
    case 'pathPaymentStrictReceive':
      addPathPaymentStrictReceiveOp(operation, addBodyLine);
      return;
    case 'pathPaymentStrictSend':
      addPathPaymentStrictSendOp(operation, addBodyLine);
      return;
    case 'manageSellOffer':
      addManageSellOfferOp(operation, addBodyLine);
      return;
    case 'createPassiveSellOffer':
      addCreatePassiveSellOfferOp(operation, addBodyLine);
      return;
    case 'setOptions':
      addSetOptionsOp(operation, addBodyLine);
      return;
    case 'changeTrust':
      addChangeTrustOp(operation, addBodyLine);
      return;
    case 'allowTrust':
      addAllowTrustOp(operation, addBodyLine);
      return;
    case 'accountMerge':
      addAccountMergeOp(operation, addOpLine);
      return;
    case 'manageData':
      addManageDataOp(operation, addBodyLine);
      return;
    case 'bumpSequence':
      addBumpSequenceOp(operation, addBodyLine);
      return;
    case 'manageBuyOffer':
      addManageBuyOfferOp(operation, addBodyLine);
      return;
    default:
      throw Error(`${operation.type} is not implemented`);
  }
}

function addCreateAccountOperation(
  operation: Operation.CreateAccount,
  addBodyLine: LineAdder
) {
  addBodyLine('destination', operation.destination);
  addBodyLine('startingBalance', toAmount(operation.startingBalance));
}

function addPaymentOperation(
  operation: Operation.Payment,
  addBodyLine: LineAdder
) {
  addBodyLine('destination', operation.destination);
  addBodyLine('asset', toAsset(operation.asset));
  addBodyLine('amount', toAmount(operation.amount));
}

function addPathPaymentStrictReceiveOp(
  operation: Operation.PathPaymentStrictReceive,
  addBodyLine: LineAdder
) {
  addBodyLine('sendAsset', toAsset(operation.sendAsset));
  addBodyLine('sendMax', toAmount(operation.sendMax));
  addBodyLine('destination', operation.destination);
  addBodyLine('destAsset', toAsset(operation.destAsset));
  addBodyLine('destAmount', toAmount(operation.destAmount));
  addBodyLine('path.len', operation.path.length);
  operation.path.forEach((asset, i) => {
    addBodyLine(`path[${i}]`, toAsset(asset));
  });
}

function addPathPaymentStrictSendOp(
  operation: Operation.PathPaymentStrictSend,
  addBodyLine: LineAdder
) {
  addBodyLine('sendAsset', toAsset(operation.sendAsset));
  addBodyLine('sendAmount', toAmount(operation.sendAmount));
  addBodyLine('destination', operation.destination);
  addBodyLine('destAsset', toAsset(operation.destAsset));
  addBodyLine('destMin', toAmount(operation.destMin));
  addBodyLine('path.len', operation.path.length);
  operation.path.forEach((asset, i) => {
    addBodyLine(`path[${i}]`, toAsset(asset));
  });
}
function addManageSellOfferOp(
  operation: Operation.ManageSellOffer,
  addBodyLine: LineAdder
) {
  addBodyLine('selling', toAsset(operation.selling));
  addBodyLine('buying', toAsset(operation.buying));
  addBodyLine('amount', toAmount(operation.amount));
  addPrice(operation.price, addBodyLine);
  addBodyLine('offerID', operation.offerId);
}

function addCreatePassiveSellOfferOp(
  operation: Operation.CreatePassiveSellOffer,
  addBodyLine: LineAdder
) {
  addBodyLine('selling', toAsset(operation.selling));
  addBodyLine('buying', toAsset(operation.buying));
  addBodyLine('amount', toAmount(operation.amount));
  addPrice(operation.price, addBodyLine);
}

function addSetOptionsOp(
  operation: Operation.SetOptions,
  addBodyLine: LineAdder
) {
  addBodyLine('inflationDest', operation.inflationDest, true);
  addBodyLine('clearFlags', operation.clearFlags, true);
  addBodyLine('setFlags', operation.setFlags, true);
  addBodyLine('masterWeight', operation.masterWeight, true);
  addBodyLine('lowThreshold', operation.lowThreshold, true);
  addBodyLine('medThreshold', operation.medThreshold, true);
  addBodyLine('highThreshold', operation.highThreshold, true);
  addBodyLine('homeDomain', toString(operation.homeDomain), true);
  addSigner(operation.signer, addBodyLine);
}

function addPrice(price: string, addBodyLine: LineAdder) {
  const [n, d] = best_r(price);
  addBodyLine('price.n', n);
  addBodyLine('price.d', d);
}

function addSigner(signer: Signer, addBodyLine: LineAdder) {
  addBodyLine('signer._present', !!signer);
  if (signer) {
    if ((signer as Signer.Ed25519PublicKey).ed25519PublicKey) {
      addBodyLine(
        'signer.key',
        (signer as Signer.Ed25519PublicKey).ed25519PublicKey
      );
    } else if ((signer as Signer.PreAuthTx).preAuthTx) {
      addBodyLine(
        'signer.key',
        StrKey.encodePreAuthTx((signer as Signer.PreAuthTx).preAuthTx)
      );
    } else if ((signer as Signer.Sha256Hash).sha256Hash) {
      addBodyLine(
        'signer.key',
        StrKey.encodeSha256Hash((signer as Signer.Sha256Hash).sha256Hash)
      );
    }
    addBodyLine('signer.weight', signer.weight);
  }
}

function addChangeTrustOp(
  operation: Operation.ChangeTrust,
  addBodyLine: LineAdder
) {
  addBodyLine('line', toAsset(operation.line as Asset)); // TODO: resolve the situation when here is a LiquidityPoolAsset
  if (operation.limit) {
    addBodyLine('limit', toAmount(operation.limit));
  }
}

function addAllowTrustOp(
  operation: Operation.AllowTrust,
  addBodyLine: LineAdder
) {
  addBodyLine('trustor', operation.trustor);
  addBodyLine('asset', operation.assetCode);
  addBodyLine('authorize', operation.authorize);
}

function addAccountMergeOp(
  operation: Operation.AccountMerge,
  addOpLine: LineAdder
) {
  // account merge does not include 'accountMergeOp' prefix
  addOpLine('body.destination', operation.destination);
}

function addManageDataOp(
  operation: Operation.ManageData,
  addBodyLine: LineAdder
) {
  addBodyLine('dataName', toString(operation.name));
  addBodyLine('dataValue._present', !!operation.value);
  if (operation.value) {
    addBodyLine('dataValue', toOpaque(operation.value));
  }
}

function addBumpSequenceOp(
  operation: Operation.BumpSequence,
  addBodyLine: LineAdder
) {
  addBodyLine('bumpTo', operation.bumpTo);
}

function addManageBuyOfferOp(
  operation: Operation.ManageBuyOffer,
  addBodyLine: LineAdder
) {
  addBodyLine('selling', toAsset(operation.selling));
  addBodyLine('buying', toAsset(operation.buying));
  addBodyLine('buyAmount', toAmount(operation.buyAmount));
  addPrice(operation.price, addBodyLine);
  addBodyLine('offerID', operation.offerId);
}

function addSignatures(signatures: xdr.DecoratedSignature[], lines: string[]) {
  addLine('signatures.len', signatures.length, lines);
  signatures.forEach((signature, i) => {
    addSignature(signature, i, lines);
  });
}

function addSignature(
  signature: xdr.DecoratedSignature,
  i: number,
  lines: string[]
) {
  const prefix = `signatures[${i}]`;
  addLine(`${prefix}.hint`, toOpaque(signature.hint()), lines);
  addLine(`${prefix}.signature`, toOpaque(signature.signature()), lines);
}

function toAsset(asset: Asset) {
  if (asset.isNative()) {
    return 'XLM';
  }

  return `${asset.code}:${asset.issuer}`;
}

function toAmount(amount: string) {
  return new BigNumber(amount).times(10000000);
}

function toString(value: string) {
  return JSON.stringify(value);
}

function toOpaque(value: string | Buffer) {
  return value.toString('hex');
}
