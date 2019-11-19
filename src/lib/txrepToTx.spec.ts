// tslint:disable:no-expression-statement
import test from 'ava';
import { MemoNone, MemoText, Operation } from 'stellar-sdk';
import { toTransaction } from './txrepToTx';

test('toTransaction.createAccount', t => {
  const txrep = `
    tx.sourceAccount: GCUNWINQBGP6ZLAFNAU74OYZCMPBY4NQO6RCOBL2LEUKIWV3VQO7YOBF
    tx.fee: 100
    tx.seqNum: 1375042369748993
    tx.timeBounds._present: true
    tx.timeBounds.minTime: 0
    tx.timeBounds.maxTime: 0
    tx.memo.type: MEMO_NONE
    tx.operations.len: 1
    tx.operations[0].sourceAccount._present: true
    tx.operations[0].sourceAccount: GCUNWINQBGP6ZLAFNAU74OYZCMPBY4NQO6RCOBL2LEUKIWV3VQO7YOBF
    tx.operations[0].body.type: CREATE_ACCOUNT
    tx.operations[0].body.createAccountOp.destination: GBAF6NXN3DHSF357QBZLTBNWUTABKUODJXJYYE32ZDKA2QBM2H33IK6O
    tx.operations[0].body.createAccountOp.startingBalance: 123400000 (12.34e7)
    tx.ext.v: 0
    signatures.len: 0
`;

  const expectedXdr = `AAAAAKjbIbAJn+ysBWgp/jsZEx4ccbB3oicFelkopFq7rB38AAAAZAAE4pgAAAABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAAAqNshsAmf7KwFaCn+OxkTHhxxsHeiJwV6WSikWrusHfwAAAAAAAAAAEBfNu3YzyLvv4ByuYW2pMAVUcNN04wTesjUDUAs0fe0AAAAAAda70AAAAAAAAAAAA==`;
  const tx = toTransaction(txrep);

  t.is(tx.source, 'GCUNWINQBGP6ZLAFNAU74OYZCMPBY4NQO6RCOBL2LEUKIWV3VQO7YOBF');
  t.is(tx.fee, 100);
  t.is(tx.sequence, '1375042369748993');
  t.is(tx.timeBounds.minTime, '0');
  t.is(tx.timeBounds.maxTime, '0');
  t.is(tx.memo.type, MemoNone);

  const operation = tx.operations[0] as Operation.CreateAccount;
  t.is(operation.type, 'createAccount');
  t.is(
    operation.source,
    'GCUNWINQBGP6ZLAFNAU74OYZCMPBY4NQO6RCOBL2LEUKIWV3VQO7YOBF'
  );
  // t.is(Number(operation.startingBalance), 12.34);
  t.is(
    operation.destination,
    'GBAF6NXN3DHSF357QBZLTBNWUTABKUODJXJYYE32ZDKA2QBM2H33IK6O'
  );

  const actualXdr = (tx.toEnvelope().toXDR('base64') as unknown) as string;
  t.is(actualXdr, expectedXdr);
});

test('toTransaction.payment', t => {
  const txrep = `
  tx.sourceAccount: GAVRMS4QIOCC4QMOSKILOOOHCSO4FEKOXZPNLKFFN6W7SD2KUB7NBPLN
  tx.fee: 100
  tx.seqNum: 46489056724385793
  tx.timeBounds._present: true
  tx.timeBounds.minTime: 1535756672 (Fri Aug 31 16:04:32 PDT 2018)
  tx.timeBounds.maxTime: 1567292672 (Sat Aug 31 16:04:32 PDT 2019)
  tx.memo.type: MEMO_TEXT
  tx.memo.text: "Enjoy this transaction"
  tx.operations.len: 1
  tx.operations[0].sourceAccount._present: false
  tx.operations[0].body.type: PAYMENT
  tx.operations[0].body.paymentOp.destination: GBAF6NXN3DHSF357QBZLTBNWUTABKUODJXJYYE32ZDKA2QBM2H33IK6O
  tx.operations[0].body.paymentOp.asset: USD:GAZFEVBSEGJJ63WPVVIWXLZLWN2JYZECECGT6GUNP4FJDVZVNXWQWMYI
  tx.operations[0].body.paymentOp.amount: 400004000 (40.0004e7)
  tx.ext.v: 0
  signatures.len: 1
  signatures[0].hint: 4aa07ed0 (GAVRMS4QIOCC4QMOSKILOOOHCSO4FEKOXZPNLKFFN6W7SD2KUB7NBPLN signer for account GAVRMS4QIOCC4QMOSKILOOOHCSO4FEKOXZPNLKFFN6W7SD2KUB7NBPLN)
  signatures[0].signature: defb4f1fad1c279327b55af184fdcddf73f4f7a8cb40e7e534a71d73a05124ba369db7a6d31b47cafd118592246a8575e6c249ab94ec3768dedb6292221ce50c
  `;

  const tx = toTransaction(txrep);

  t.is(tx.source, 'GAVRMS4QIOCC4QMOSKILOOOHCSO4FEKOXZPNLKFFN6W7SD2KUB7NBPLN');
  t.is(tx.fee, 100);
  t.is(tx.sequence, '46489056724385793');
  t.is(tx.timeBounds.minTime, '1535756672');
  t.is(tx.timeBounds.maxTime, '1567292672');
  t.is(tx.memo.type, MemoText);
  t.is(tx.memo.value, 'Enjoy this transaction');

  const operation = tx.operations[0] as Operation.Payment;
  t.is(operation.source, undefined);
  t.is(operation.type, 'payment');
  t.is(operation.asset.code, 'USD');
  t.is(
    operation.asset.issuer,
    'GAZFEVBSEGJJ63WPVVIWXLZLWN2JYZECECGT6GUNP4FJDVZVNXWQWMYI'
  );
  t.is(Number(operation.amount), 400004000);

  const signature = tx.signatures[0];
  t.is(signature.hint().toString(), '4aa07ed0');
  t.is(
    signature.signature().toString(),
    'defb4f1fad1c279327b55af184fdcddf73f4f7a8cb40e7e534a71d73a05124ba369db7a6d31b47cafd118592246a8575e6c249ab94ec3768dedb6292221ce50c'
  );
});
