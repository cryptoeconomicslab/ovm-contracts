# OVM Contracts

[![Build Status](https://travis-ci.org/cryptoeconomicslab/ovm-contracts.svg?branch=master)](https://travis-ci.org/cryptoeconomicslab/ovm-contracts)

## Overview

This is the repository to developing contracts used for Optimistic Virtual Machine. OVM is the abstraction of L2 dispute logic. Dapps developers will only have to write property to define dispute logic to develop a scalable dapp using Layer 2 protocols. Every property is claimed to the same Contract called Adjudication Contract. Properties are written by predicate logic and it can prove to true or false under dispute logic. For example, users deposit their assets to Deposit Contract and finally withdraw assets from Deposit Contract. In this scenario, Property stands for the condition which users can withdraw money from Deposit Contract. later in this document, we will describe how you can implement this kind of contract on the OVM.

## Try framework

[Framework Getting Started](https://github.com/cryptoeconomicslab/ovm-plasma-chamber-spec/blob/master/getting-started/try-plasma-chamber-in-local.md)

## Development

### Install

```
npm i
```

### Test

```
npm test
```

### Deploy to local

```
npm run deploy:dev
```

### Spec

https://github.com/cryptoeconomicslab/ovm-plasma-chamber-spec/blob/master/core-spec/index.md#contract-spec
