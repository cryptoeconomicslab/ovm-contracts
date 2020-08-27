pragma solidity ^0.5.0;

contract DisputeKind {
    bytes internal CHECKPOINT_CLAIM = bytes("CHECKPOINT_CLAIM");
    bytes internal CHECKPOINT_CHALLENGE = bytes("CHECKPOINT_CHALLENGE");
    bytes internal EXIT_CLAIM = bytes("EXIT_CLAIM");
    bytes internal EXIT_SPENT_CHALLENGE = bytes("EXIT_SPENT_CHALLENGE");
    bytes internal EXIT_CHECKPOINT_CHALLENGE = bytes(
        "EXIT_CHECKPOINT_CHALLENGE"
    );

    bytes internal BATCH_EXIT_CLAIM = bytes("BATCH_EXIT_CLAIM");
}
